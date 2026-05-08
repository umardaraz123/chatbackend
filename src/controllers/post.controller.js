import Post from '../models/post.model.js';
import User from '../models/user.model.js';
import cloudinary from '../lib/cloudinary.js';

// ─── helpers ────────────────────────────────────────────────────────────────

/**
 * Returns the Set of user IDs that are "friends of friends" of the current user
 * (excludes current user and direct friends – they are already covered separately).
 */
const getFriendsOfFriends = async (myId, myFriends) => {
  if (!myFriends.length) return [];
  const friendDocs = await User.find({ _id: { $in: myFriends } }).select('friends').lean();
  const myIdStr = myId.toString();
  const myFriendStrs = new Set(myFriends.map((f) => f.toString()));

  const fofSet = new Set();
  for (const fd of friendDocs) {
    for (const fid of fd.friends || []) {
      const s = fid.toString();
      if (s !== myIdStr && !myFriendStrs.has(s)) fofSet.add(s);
    }
  }
  return [...fofSet];
};

// ─── GET /api/posts  (feed) ──────────────────────────────────────────────────
export const getFeed = async (req, res) => {
  try {
    const me = req.user;
    const myId = me._id;
    const myFriends = me.friends || [];
    const blocked = me.blockedUsers || [];

    const fof = await getFriendsOfFriends(myId, myFriends);

    const posts = await Post.find({
      // Never show posts from blocked users (except own)
      $and: [
        {
          $or: [
            { author: myId }, // always see my own posts
            {
              author: { $nin: blocked },
              $or: [
                { visibility: 'public' },
                { visibility: 'friends', author: { $in: myFriends } },
                {
                  visibility: 'friends_of_friends',
                  author: { $in: [...myFriends, ...fof] },
                },
              ],
            },
          ],
        },
      ],
    })
      .populate('author', 'firstName lastName profilePic')
      .populate('comments.user', 'firstName lastName profilePic')
      .populate('comments.replyToUser', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(60)
      .lean();

    res.json(posts);
  } catch (err) {
    console.error('getFeed error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── POST /api/posts  (create) ───────────────────────────────────────────────
export const createPost = async (req, res) => {
  try {
    const { text, image, visibility } = req.body;
    if (!text && !image) {
      return res.status(400).json({ message: 'Post must have text or an image.' });
    }

    let imageUrl = null;
    if (image) {
      const result = await cloudinary.uploader.upload(image, {
        folder: 'posts',
        resource_type: 'image',
      });
      imageUrl = result.secure_url;
    }

    const post = await Post.create({
      author: req.user._id,
      text: text?.trim() || null,
      image: imageUrl,
      visibility: visibility || 'public',
    });

    const populated = await Post.findById(post._id)
      .populate('author', 'firstName lastName profilePic')
      .lean();

    res.status(201).json(populated);
  } catch (err) {
    console.error('createPost error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── PUT /api/posts/:id  (update text / visibility) ─────────────────────────
export const updatePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    if (post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const { text, visibility } = req.body;
    if (text !== undefined) post.text = text.trim();
    if (visibility) post.visibility = visibility;
    await post.save();

    const populated = await Post.findById(post._id)
      .populate('author', 'firstName lastName profilePic')
      .populate('comments.user', 'firstName lastName profilePic')
      .populate('comments.replyToUser', 'firstName lastName')
      .lean();

    res.json(populated);
  } catch (err) {
    console.error('updatePost error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── DELETE /api/posts/:id ───────────────────────────────────────────────────
export const deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    if (post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    // Remove cloudinary image if exists
    if (post.image) {
      const pid = post.image.split('/').pop().split('.')[0];
      await cloudinary.uploader.destroy(`posts/${pid}`).catch(() => {});
    }

    await post.deleteOne();
    res.json({ success: true });
  } catch (err) {
    console.error('deletePost error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── POST /api/posts/:id/like  (toggle) ─────────────────────────────────────
export const toggleLike = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const uid = req.user._id.toString();
    const idx = post.likes.findIndex((l) => l.toString() === uid);

    if (idx === -1) {
      post.likes.push(req.user._id);
    } else {
      post.likes.splice(idx, 1);
    }

    await post.save();
    res.json({ likes: post.likes, liked: idx === -1 });
  } catch (err) {
    console.error('toggleLike error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── POST /api/posts/:id/comments  (add comment) ────────────────────────────
export const addComment = async (req, res) => {
  try {
    const { text, replyToUser } = req.body;
    if (!text?.trim()) return res.status(400).json({ message: 'Comment cannot be empty' });

    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const commentData = { user: req.user._id, text: text.trim() };
    if (replyToUser) commentData.replyToUser = replyToUser;

    post.comments.push(commentData);
    await post.save();

    // Return only the new comment (populated)
    const updated = await Post.findById(post._id)
      .populate('comments.user', 'firstName lastName profilePic')
      .populate('comments.replyToUser', 'firstName lastName')
      .lean();

    const newComment = updated.comments[updated.comments.length - 1];
    res.status(201).json(newComment);
  } catch (err) {
    console.error('addComment error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── DELETE /api/posts/:id/comments/:commentId ──────────────────────────────
export const deleteComment = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const comment = post.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    const uid = req.user._id.toString();
    const isCommentOwner = comment.user.toString() === uid;
    const isPostOwner = post.author.toString() === uid;

    if (!isCommentOwner && !isPostOwner) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    comment.deleteOne();
    await post.save();
    res.json({ success: true });
  } catch (err) {
    console.error('deleteComment error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── GET /api/posts/my  (my own posts) ──────────────────────────────────────
export const getMyPosts = async (req, res) => {
  try {
    const posts = await Post.find({ author: req.user._id })
      .populate('author', 'firstName lastName profilePic')
      .populate('comments.user', 'firstName lastName profilePic')
      .populate('comments.replyToUser', 'firstName lastName')
      .sort({ createdAt: -1 })
      .lean();
    res.json(posts);
  } catch (err) {
    console.error('getMyPosts error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
