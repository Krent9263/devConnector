const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth')
const { check, validationResult } = require('express-validator');

const Profile = require('../../models/Profile')
const User = require('../../models/User')

// @route    GET api/profile/me
// @desc     GET curret user profile 
// @access   Private
router.get('/me', auth, async (req, res) => {
  try {
    const profile = await Profile.findOne({ user: req.user.id }).populate('user', ['name', 'avatar']);
    if (!profile) {
      return res.status(400).json({ msg: 'There is no profile for this user' })
    }
    res.json(profile);
  } catch (err) {
    console.log(err.message);
    res.status(500).send('Server Error')
  }
});

// @route    POST api/profile/me
// @desc     Create or update user profile
// @access   Private
router.post('/', [auth, [
  check('status', 'Status is required').not().isEmpty(),
  check('skills', 'Skills is required').not().isEmpty()
]], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() })
  }
  const { company, website, location, bio, status, githubusername, skills, youtube, facebook, twitter, instagram, linkedin } = req.body;

  // Build profile object
  const profileFields = {};
  profileFields.user = req.user.id;
  if (company) profileFields.company = company;
  if (website) profileFields.website = website;
  if (location) profileFields.location = location;
  if (bio) profileFields.bio = bio;
  if (status) profileFields.status = status;
  if (githubusername) profileFields.githubusername = githubusername;
  if (skills) {
    profileFields.skills = skills.split(',').map(skill => skill.trim());
  }

  // Build social object
  profileFields.social = {};
  if (youtube) profileFields.social.youtube = youtube;
  if (twitter) profileFields.social.twitter = twitter;
  if (facebook) profileFields.social.facebook = facebook;
  if (linkedin) profileFields.social.linkedin = linkedin;
  if (instagram) profileFields.social.instagram = instagram;

  try {
    let profile = await Profile.findOne({ user: req.user.id });
    if (profile) {
      // Update
      profile = await Profile.findOneAndUpdate(
        { user: req.user.id },
        { $set: profileFields },
        { new: true }
      );
      return res.json(profile);
    }
    // Create
    profile = new Profile(profileFields);
    await profile.save();
    res.json(profile);
  } catch (err) {
    console.log(err.message);
    res.status(500).send('Server Error')
  }

});

// @route    GET api/profile/all
// @desc     GET all user profile 
// @access   Public

router.get('/all', async (req, res) => {
  try {
    const profiles = await Profile.find().populate('user', ['name', 'avatar']);
    res.json(profiles);
  } catch (err) {
    console.log(err.message);
    res.status(500).send('Server Error')
  }
});

// @route    GET api/profile/user/:userId
// @desc     GET profile by user ID
// @access   Public

router.get('/user/:userId', async (req, res) => {
  try {
    const profile = await Profile.findOne({ user: req.params.userId }).populate('user', ['name', 'avatar']);
    if (!profile) return res.status(400).json({ msg: 'Profile not found' });
    res.json(profile);
  } catch (err) {
    console.log(err.message);
    if (err.kind == 'ObjectId') {
      return res.status(400).json({ msg: 'Profile not found' });
    }
    res.status(500).send('Server Error')
  }
});

// @route    Delete api/profile/user/:userId
// @desc     Delete profile by user ID
// @access   Private

router.delete('/user/delete', auth, async (req, res) => {
  try {
    // Remove profile
    await Profile.findOneAndDelete({ user: req.user.id });
    // Remove user
    await User.findOneAndDelete({ _id: req.user.id });
    res.json({ msg: 'User deleted' });
  } catch (err) {
    console.log(err.message);
    if (err.kind == 'ObjectId') {
      return res.status(400).json({ msg: 'Profile not found' });
    }
    res.status(500).send('Server Error')
  }
});

// @route    POST api/profile/experience
// @desc     POST experience to user profile 
// @access   Private

router.post('/experience', auth, [
  check('title', 'Title is required').not().isEmpty(),
  check('company', 'Company is required').not().isEmpty(),
  check('from', 'From date is required').not().isEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }
    const { title, company, location, from, to, current, description } = req.body;
    const newExp = { title, company, location, from, to, current, description };
    const profile = await Profile.findOne({ user: req.user.id });
    profile.experience.unshift(newExp);
    await profile.save();
    res.json(profile);

  } catch (err) {
    console.log(err.message);
    res.status(500).send('Server Error')
  }
});

// @route    PUT api/profile/experience/:id
// @desc     PUT experience to user profile 
// @access   Private
router.put('/experience/:exp_id', auth, [
  check('exp_id', 'Experience ID is required').not().isEmpty(),
  check('title', 'Title is required').not().isEmpty(),
  check('company', 'Company is required').not().isEmpty(),
  check('from', 'From date is required').not().isEmpty()

], async (req, res) => {

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }
    const { title, company, location, from, to, current, description } = req.body;
    const profile = await Profile.findOne({ user: req.user.id });

          const expIndex = profile.experience.findIndex(exp => exp.id === req.params.exp_id);
      if (expIndex === -1) {
        return res.status(404).json({ msg: 'Experience not found' });
      }

           profile.experience[expIndex] = {
        ...profile.experience[expIndex]._doc,
        title,
        company,
        location,
        from,
        to,
        current,
        description
      };

    await profile.save();
    res.json(profile);
  } catch (err) {
    console.log(err.message);
    res.status(500).send('Server Error')
  }
});

// @route    DELETE api/profile/experience/:id/delete
// @desc     DELETE experience from user profile 
// @access   Private

router.delete('/experience/:exp_id/delete', auth, async (req, res) => {
  try {
    const profile = await Profile.findOne({ user: req.user.id });
    // Get remove index
    const removeIndex = profile.experience.map(item => item.id).indexOf(req.params.exp_id);
    if (removeIndex === -1) {
      return res.status(404).json({ msg: 'Experience not found' });
    }

    profile.experience.splice(removeIndex, 1);
    await profile.save();
    res.json(profile);
  } catch (err) {
    console.log(err.message);
    res.status(500).send('Server Error')
  }
});


// @route    POST api/profile/education
// @desc     POST education to user profile 
// @access   Private

router.post('/education', auth, [
  check('school', 'School is required').not().isEmpty(),
  check('degree', 'Degree is required').not().isEmpty(),
  check('fieldofstudy', 'Field of study is required').not().isEmpty(),
  check('from', 'From date is required').not().isEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }
    const { school, degree, fieldofstudy, from, to, current, description } = req.body;
    const newEdu = { school, degree, fieldofstudy, from, to, current, description };
    const profile = await Profile.findOne({ user: req.user.id });
    profile.education.unshift(newEdu);
    await profile.save();
    res.json(profile);

  } catch (err) {
    console.log(err.message);
    res.status(500).send('Server Error')
  }
});

// @route    PUT api/profile/education/:edu_id
// @desc     PUT education to user profile 
// @access   Private
router.put('/education/:edu_id', auth, [
  check('edu_id', 'Education ID is required').not().isEmpty(),
  check('School', 'School is required').not().isEmpty(),
  check('degree', 'Degree is required').not().isEmpty(),
  check('fieldofstudy', 'Field of study is required').not().isEmpty(),
  check('from', 'From date is required').not().isEmpty()

], async (req, res) => {

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }
    const { School, degree, fieldofstudy, from, to, current, description } = req.body;
    const profile = await Profile.findOne({ user: req.user.id });

          const eduIndex = profile.education.findIndex(edu => edu.id === req.params.edu_id);
      if (eduIndex === -1) {
        return res.status(404).json({ msg: 'Education not found' });
      }

           profile.education[eduIndex] = {
        ...profile.education[eduIndex]._doc,
        School,
        degree,
        fieldofstudy,
        from,
        to,
        current,
        description
      };

    await profile.save();
    res.json(profile);
  } catch (err) {
    console.log(err.message);
    res.status(500).send('Server Error')
  }
});


// @route    DELETE api/profile/education/:edu_id/delete
// @desc     DELETE education from user profile 
// @access   Private

router.delete('/education/:edu_id/delete', auth, async (req, res) => {
  try {
    const profile = await Profile.findOne({ user: req.user.id });
    // Get remove index
    const removeIndex = profile.education.map(item => item.id).indexOf(req.params.edu_id);
    if (removeIndex === -1) {
      return res.status(404).json({ msg: 'Education not found' });
    }

    profile.education.splice(removeIndex, 1);
    await profile.save();
    res.json(profile);
  } catch (err) {
    console.log(err.message);
    res.status(500).send('Server Error')
  }
});


module.exports = router;