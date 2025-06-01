// controllers/swipe.controller.js
import Swipe from '../models/swipe.model.js';
import User from '../models/user.model.js';

export const getSwipeableUsers = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Get users that haven't been swiped on yet
    const swipedUserIds = await Swipe.find({ swiper: userId }).distinct('swiped');
    
    // Get user's friends to exclude them too
    const currentUser = await User.findById(userId);
    const friendIds = currentUser.friends || [];
    
    // Also exclude users who have already swiped on the current user and been rejected
    const rejectedByIds = await Swipe.find({ 
      swiper: { $ne: userId }, 
      swiped: userId, 
      action: 'dislike' 
    }).distinct('swiper');
    
    const excludeIds = [...swipedUserIds, ...friendIds, ...rejectedByIds, userId];
    
    const users = await User.find({
      _id: { $nin: excludeIds },
      role: { $ne: 'admin' }
    }).select('-password').limit(20); // Increased limit for better user experience
    
    // If no users found, return empty array instead of 404
    if (!users || users.length === 0) {
      return res.status(200).json([]);
    }
    
    const structuredUsers = users.map(user => ({
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
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }));
    
    res.status(200).json(structuredUsers);
  } catch (error) {
    console.error('Error fetching swipeable users:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const swipeUser = async (req, res) => {
  try {
    const { userId, action } = req.body;
    const swiperId = req.user._id;
    
    if (userId === swiperId.toString()) {
      return res.status(400).json({ message: "Cannot swipe on yourself" });
    }
    
    // Check if already swiped
    const existingSwipe = await Swipe.findOne({ 
      swiper: swiperId, 
      swiped: userId 
    });
    
    if (existingSwipe) {
      // Instead of returning an error, return success
      return res.status(200).json({ 
        success: true, 
        isMatch: false,
        message: "Already swiped on this user",
        alreadySwiped: true
      });
    }
    
    // Create swipe record
    const swipe = new Swipe({
      swiper: swiperId,
      swiped: userId,
      action
    });
    
    await swipe.save();
    
    let isMatch = false;
    let matchedUser = null;
    
    // Check for mutual like (match)
    if (action === 'like') {
      const mutualSwipe = await Swipe.findOne({
        swiper: userId,
        swiped: swiperId,
        action: 'like'
      });
      
      if (mutualSwipe) {
        isMatch = true;
        
        // Get full user details for the match
        const user = await User.findById(userId).select('-password');
        matchedUser = {
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
          politics: user.politics
        };
      }
    }
    
    res.status(200).json({ 
      success: true, 
      isMatch,
      matchedUser,
      message: isMatch ? "It's a match! 🎉" : "Swipe recorded"
    });
    
  } catch (error) {
    console.error('Error processing swipe:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getMatches = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Find mutual likes, excluding admin users
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
    
    const matches = validMutualLikes.map(swipe => {
      const user = swipe.swiper;
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
        isOnline: user.isOnline || false
      };
    });
    
    res.status(200).json(matches);
  } catch (error) {
    console.error('Error fetching matches:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getLikedUsers = async (req, res) => {
  try {
    const userId = req.user._id;
    
    const likedSwipes = await Swipe.find({
      swiper: userId,
      action: 'like'
    }).populate({
      path: 'swiped',
      select: '-password',
      match: { role: { $ne: 'admin' } } // Exclude admin users
    });
    
    // Filter out null populated results (admin users)
    const validLikedSwipes = likedSwipes.filter(swipe => swipe.swiped !== null);
    
    const likedUsers = [];
    
    for (const swipe of validLikedSwipes) {
      // Check if it's now a mutual like (match)
      const mutualLike = await Swipe.findOne({
        swiper: swipe.swiped._id,
        swiped: userId,
        action: 'like'
      });
      
      // Only include if NOT a match (matches go to matches page)
      if (!mutualLike) {
        const user = swipe.swiped;
        
        // Check if they've swiped on you at all
        const theirSwipe = await Swipe.findOne({
          swiper: swipe.swiped._id,
          swiped: userId
        });
        
        likedUsers.push({
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
          likedAt: swipe.createdAt,
          
          // Dynamic status fields
          isMatch: false,
          hasViewed: !!theirSwipe,
          theirAction: theirSwipe ? theirSwipe.action : null,
          status: theirSwipe 
            ? (theirSwipe.action === 'dislike' ? 'rejected' : 'pending')
            : 'pending'
        });
      }
    }
    
    res.status(200).json(likedUsers);
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