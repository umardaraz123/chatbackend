import mongoose from 'mongoose';
import Swipe from '../models/swipe.model.js';
import User from '../models/user.model.js';
import Match from '../models/match.model.js';

export const getSwipeableUsers = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    console.log('Getting swipeable users - Page:', page, 'Limit:', limit, 'Skip:', skip);

    // Get users that current user has already swiped on (any action)
    const usersYouSwipedOn = await Swipe.find({ 
      swiper: currentUserId 
    }).distinct('swiped');

    // Get users who have liked you (they should be in DropBox, not swipeable list)
    const usersWhoLikedYou = await Swipe.find({
      swiped: currentUserId,
      action: 'like'
    }).distinct('swiper');

    // BUT: If you already responded to someone who liked you, they can appear again
    const usersYouRespondedTo = await Swipe.find({
      swiper: currentUserId
    }).distinct('swiped');

    // Users who liked you BUT you haven't responded to = should be in DropBox only
    const pendingLikesFromOthers = usersWhoLikedYou.filter(userId => 
      !usersYouRespondedTo.map(id => id.toString()).includes(userId.toString())
    );

    const excludedUserIds = [
      ...usersYouSwipedOn.map(id => id.toString()),
      ...pendingLikesFromOthers.map(id => id.toString()),
      currentUserId.toString()
    ];

    const uniqueExcludedIds = [...new Set(excludedUserIds)];
    console.log('Total excluded users:', uniqueExcludedIds.length);

    // Get total count first
    const totalUsers = await User.countDocuments({
      _id: { $nin: uniqueExcludedIds }
    });

    console.log('Total available users:', totalUsers);

    const users = await User.find({
      _id: { $nin: uniqueExcludedIds }
    })
    .select('firstName lastName profilePic bio location dateOfBirth interests gender')
    .skip(skip)
    .limit(limit)
    .lean();

    console.log(`Found ${users.length} users for page ${page}`);

    const calculateAge = (dateOfBirth) => {
      if (!dateOfBirth) return null;
      try {
        const dob = new Date(dateOfBirth);
        const today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        const monthDiff = today.getMonth() - dob.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
          age--;
        }
        return age;
      } catch (error) {
        return null;
      }
    };

    const usersWithAge = users.map(user => ({
      ...user,
      fullName: `${user.firstName} ${user.lastName}`,
      age: calculateAge(user.dateOfBirth)
    }));

    // Add pagination info to response headers
    res.set({
      'X-Total-Count': totalUsers.toString(),
      'X-Page': page.toString(),
      'X-Per-Page': limit.toString(),
      'X-Has-More': (skip + users.length < totalUsers).toString()
    });

    res.json(usersWithAge);
  } catch (error) {
    console.error('Error fetching swipeable users:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const swipeUser = async (req, res) => {
  try {
    const { userId, action, likeType } = req.body;
    const swiperId = req.user._id;
    
    console.log('=== SWIPE DEBUG ===');
    console.log('Swiper (YOU):', swiperId);
    console.log('Target (THEM):', userId);
    console.log('Action:', action);
    console.log('Like type:', likeType);
    
    if (userId === swiperId.toString()) {
      return res.status(400).json({ message: "Cannot swipe on yourself" });
    }
    
    // Check if you already swiped on this user
    const existingSwipe = await Swipe.findOne({ 
      swiper: swiperId, 
      swiped: userId 
    });
    
    console.log('Existing swipe check:', existingSwipe);
    
    if (existingSwipe) {
      console.log('You already swiped on this user');
      return res.status(200).json({ 
        success: true, 
        isMatch: false,
        message: "Already swiped on this user",
        alreadySwiped: true
      });
    }
    
    // Create new swipe
    const newSwipe = new Swipe({
      swiper: swiperId,
      swiped: userId,
      action,
      likeType: action === 'like' ? likeType : null,
      createdAt: new Date()
    });
    
    const savedSwipe = await newSwipe.save();
    console.log('New swipe saved:', savedSwipe);
    
    let isMatch = false;
    let matchCreated = null;
    
    // Only check for matches if this is a LIKE action
    if (action === 'like') {
      // Find if the other user has also LIKED you
      const reciprocalSwipe = await Swipe.findOne({
        swiper: userId,
        swiped: swiperId,
        action: 'like'
      });
      
      console.log('Reciprocal swipe found:', reciprocalSwipe);
      
      if (reciprocalSwipe) {
        // Check if BOTH performed the SAME like type
        const isSameLikeType = reciprocalSwipe.likeType === likeType;
        
        console.log('Like type comparison:', {
          theirLikeType: reciprocalSwipe.likeType,
          yourLikeType: likeType,
          isSameLikeType
        });
        
        // Create match only if same like types
        if (isSameLikeType && likeType) {
          isMatch = true;
          
          // Check if match already exists
          const existingMatch = await Match.findOne({
            users: { $all: [swiperId, userId] }
          });
          
          if (!existingMatch) {
            const match = new Match({
              users: [swiperId, userId],
              isMutualEmotion: true,
              yourLikeType: likeType,
              theirLikeType: reciprocalSwipe.likeType,
              createdAt: new Date()
            });
            
            matchCreated = await match.save();
            console.log('🎉 NEW MATCH CREATED:', matchCreated);
          } else {
            console.log('Match already exists');
            isMatch = true;
          }
        }
      }
    }
    
    const responseData = {
      success: true,
      isMatch,
      likeType: action === 'like' ? likeType : null,
      message: action === 'like' ? 'User liked successfully' : 'User passed'
    };
    
    console.log('Sending response:', responseData);
    res.status(201).json(responseData);
    
  } catch (error) {
    console.error('Error processing swipe:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getMatches = async (req, res) => {
  try {
    const userId = req.user._id;
    console.log('Getting matches for user:', userId);
    
    // Find all matches where current user is involved
    const matches = await Match.find({
      users: userId
    })
    .populate('users', 'firstName lastName profilePic bio location dateOfBirth interests gender')
    .sort({ createdAt: -1 });

    console.log('Found matches from DB:', matches.length);
    console.log('Raw matches:', matches);

    if (!matches || matches.length === 0) {
      return res.json([]);
    }

    // Helper function to calculate age
    const calculateAge = (dateOfBirth) => {
      if (!dateOfBirth) return null;
      try {
        const dob = new Date(dateOfBirth);
        const today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        const monthDiff = today.getMonth() - dob.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
          age--;
        }
        return age;
      } catch (error) {
        console.error('Error calculating age:', error);
        return null;
      }
    };

    const structuredMatches = matches.map(match => {
      try {
        // Get the other user (not the current user)
        const otherUser = match.users.find(user => 
          user._id.toString() !== userId.toString()
        );
        
        if (!otherUser) {
          console.error('Other user not found in match:', match._id);
          return null;
        }

        const structuredMatch = {
          _id: match._id,
          user: {
            _id: otherUser._id,
            firstName: otherUser.firstName,
            lastName: otherUser.lastName,
            fullName: `${otherUser.firstName} ${otherUser.lastName}`,
            profilePic: otherUser.profilePic,
            bio: otherUser.bio,
            location: otherUser.location,
            age: calculateAge(otherUser.dateOfBirth),
            interests: otherUser.interests || [],
            gender: otherUser.gender
          },
          yourLikeType: match.yourLikeType || null,
          theirLikeType: match.theirLikeType || null,
          isMutualEmotion: match.isMutualEmotion || false,
          matchedAt: match.createdAt
        };
        
        console.log('Structured match:', structuredMatch);
        return structuredMatch;
      } catch (error) {
        console.error('Error processing match:', match._id, error);
        return null;
      }
    }).filter(match => match !== null);

    console.log('Final structured matches:', structuredMatches.length);
    res.json(structuredMatches);

  } catch (error) {
    console.error('Error fetching matches:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const getLikedUsers = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Get all users that the current user has liked with their like types
    const likedUsers = await Swipe.find({ 
      swiper: userId, 
      action: 'like' 
    })
    .populate('swiped', 'firstName lastName profilePic bio location dateOfBirth interests gender')
    .sort({ createdAt: -1 });
    
    const structuredUsers = likedUsers.map(swipe => ({
      _id: swipe.swiped._id,
      firstName: swipe.swiped.firstName,
      lastName: swipe.swiped.lastName,
      fullName: `${swipe.swiped.firstName} ${swipe.swiped.lastName}`,
      profilePic: swipe.swiped.profilePic,
      bio: swipe.swiped.bio,
      location: swipe.swiped.location,
      age: calculateAge(swipe.swiped.dateOfBirth),
      interests: swipe.swiped.interests,
      gender: swipe.swiped.gender,
      likedAt: swipe.createdAt,
      likeType: swipe.likeType, // YOUR like type for this user
      
      // Check if they also liked you back (match status)
      isMatch: false, // We'll calculate this below
      status: 'pending'
    }));
    
    // Check for matches
    for (let user of structuredUsers) {
      const reciprocalSwipe = await Swipe.findOne({
        swiper: user._id,
        swiped: userId,
        action: 'like'
      });
      
      if (reciprocalSwipe) {
        user.isMatch = true;
        user.status = 'matched';
        user.theirLikeType = reciprocalSwipe.likeType; // What they felt about you
      }
    }
    
    res.json(structuredUsers);
  } catch (error) {
    console.error('Error fetching liked users:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getDetailedMatches = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Get all matches with full details, excluding admin users
    const userLikes = await Swipe.find({ 
      swiper: userId, 
      action: 'like' 
    }).distinct('swiped');
    
    const mutualLikes = await Swipe.find({
      swiper: { $in: userLikes },
      swiped: userId,
      action: 'like'
    }).populate({
      path: 'swiper',
      select: '-password',
      match: { role: { $ne: 'admin' } } // Exclude admin users
    });
    
    // Filter out null populated results (admin users)
    const validMutualLikes = mutualLikes.filter(swipe => swipe.swiper !== null);
    
    // Get additional match statistics
    const detailedMatches = await Promise.all(
      validMutualLikes.map(async (swipe) => {
        const user = swipe.swiper;
        
        // Get mutual interests
        const currentUserData = await User.findById(userId);
        const mutualInterests = user.interests?.filter(interest => 
          currentUserData.interests?.includes(interest)
        ) || [];
        
        // Calculate compatibility score (basic example)
        let compatibilityScore = 0;
        if (mutualInterests.length > 0) compatibilityScore += 20;
        if (user.location === currentUserData.location) compatibilityScore += 15;
        if (user.education === currentUserData.education) compatibilityScore += 10;
        if (user.religion === currentUserData.religion) compatibilityScore += 10;
        if (user.politics === currentUserData.politics) compatibilityScore += 5;
        
        return {
          _id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: `${user.firstName} ${user.lastName}`,
          email: user.email,
          profilePic: user.profilePic,
          bio: user.bio,
          location: user.location,
          dateOfBirth: user.dateOfBirth,
          age: calculateAge(user.dateOfBirth),
          interests: user.interests,
          mutualInterests,
          lookingFor: user.lookingFor,
          height: user.height,
          hairs: user.hairs,
          eyes: user.eyes,
          weight: user.weight,
          sociability: user.sociability,
          relationship: user.relationship,
          orientation: user.orientation,
          smoking: user.smoking,
          alcohol: user.alcohol,
          gender: user.gender,
          education: user.education,
          occupation: user.occupation,
          languages: user.languages,
          zodiacSign: user.zodiacSign,
          pets: user.pets,
          exercise: user.exercise,
          diet: user.diet,
          children: user.children,
          religion: user.religion,
          politics: user.politics,
          matchedAt: swipe.createdAt,
          lastActive: user.lastActive || user.updatedAt,
          isOnline: user.isOnline || false,
          compatibilityScore: Math.min(compatibilityScore, 100) // Cap at 100%
        };
      })
    );
    
    res.status(200).json(detailedMatches);
  } catch (error) {
    console.error('Error fetching detailed matches:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getSwipeStats = async (req, res) => {
  try {
    const userId = req.user._id;
    
    const totalLikes = await Swipe.countDocuments({
      swiper: userId,
      action: 'like'
    });
    
    const totalDislikes = await Swipe.countDocuments({
      swiper: userId,
      action: 'dislike'
    });
    
    // Get actual matches count
    const userLikes = await Swipe.find({ 
      swiper: userId, 
      action: 'like' 
    }).distinct('swiped');
    
    const totalMatches = await Swipe.countDocuments({
      swiper: { $in: userLikes },
      swiped: userId,
      action: 'like'
    });
    
    // Get likes received
    const likesReceived = await Swipe.countDocuments({
      swiped: userId,
      action: 'like'
    });
    
    res.status(200).json({
      totalLikes,
      totalDislikes,
      totalMatches,
      likesReceived,
      totalSwipes: totalLikes + totalDislikes,
      matchRate: totalLikes > 0 ? ((totalMatches / totalLikes) * 100).toFixed(1) : 0
    });
  } catch (error) {
    console.error('Error fetching swipe stats:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getReceivedSwipes = async (req, res) => {
  try {
    const userId = req.user._id;
    console.log('Getting received swipes for user:', userId);
    
    // Get swipes where others liked the current user
    const receivedSwipes = await Swipe.find({
      swiped: userId,
      action: 'like'
    })
    .populate('swiper', 'firstName lastName profilePic bio location dateOfBirth interests gender')
    .sort({ createdAt: -1 });

    console.log('Total received swipes:', receivedSwipes.length);

    // Get all users current user has already responded to
    const userResponses = await Swipe.find({ 
      swiper: userId 
    }).select('swiped action').lean();
    
    const respondedUserIds = userResponses.map(response => response.swiped.toString());
    console.log('User has responded to these IDs:', respondedUserIds);
    
    // Filter out swipes where current user has already responded
    const pendingSwipes = receivedSwipes.filter(swipe => {
      const swiperId = swipe.swiper._id.toString();
      const hasResponded = respondedUserIds.includes(swiperId);
      console.log(`User ${swipe.swiper.firstName} (${swiperId}) - Has responded: ${hasResponded}`);
      return !hasResponded;
    });

    console.log('Pending swipes after filtering:', pendingSwipes.length);

    const calculateAge = (dateOfBirth) => {
      if (!dateOfBirth) return null;
      try {
        const dob = new Date(dateOfBirth);
        const today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        const monthDiff = today.getMonth() - dob.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
          age--;
        }
        return age;
      } catch (error) {
        return null;
      }
    };

    const structuredSwipes = pendingSwipes.map(swipe => ({
      _id: swipe._id,
      user: {
        _id: swipe.swiper._id,
        firstName: swipe.swiper.firstName,
        lastName: swipe.swiper.lastName,
        fullName: `${swipe.swiper.firstName} ${swipe.swiper.lastName}`,
        profilePic: swipe.swiper.profilePic,
        bio: swipe.swiper.bio,
        location: swipe.swiper.location,
        age: calculateAge(swipe.swiper.dateOfBirth),
        interests: swipe.swiper.interests || [],
        gender: swipe.swiper.gender
      },
      likeType: swipe.likeType,
      createdAt: swipe.createdAt
    }));

    console.log('Final structured swipes to return:', structuredSwipes.length);
    res.json(structuredSwipes);
  } catch (error) {
    console.error('Error fetching received swipes:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Helper function
function calculateAge(dateOfBirth) {
  if (!dateOfBirth) return '';
  const dob = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}