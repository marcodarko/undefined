'use strict';

const User = require('../models').user;
const config = require('../../config');
const passportConfig = require('../../config/passport');
const request = require('request-promise');

function handleError(err, req, res, statusCode) {
  err = err ? err : new Error();
  err.status = statusCode || 500;
  let obj = {err};
  if(req.user) obj.userInfo = req.user;
  return res.status(err.status).render('error', obj);
}

/**
 * Get list of users
 * only 'admin'???
 */
const index = function(req, res) {
  return User.findAll({
    attributes: [ 'id', 'name', 'email', 'profileUrl', 'photo', 'githubUsername', 'role']
  })
    .then(users => {
      res.status(200).json(users);
    })
    .catch(e => handleError(e, req, res, null));
};

/**
 * Get a single user
 */
const show = function(req, res, next) {
  const userId = req.params.id;

  return User.find({ where: { id: userId } })
    .then(user => {
      if(!user) return res.status(404).end();
      res.json(user.profile);
    })
    .catch(e => handleError(e, req, res, null));
};

/**
 * Deletes a user
 * restriction: 'admin'???????
 */
const destroy = function(req, res) {
  if(req.user && req.user.id !== req.params.id) return handleError(null, req, res, 401);
  return User.destroy({ where: { _id: req.params.id } })
    .then(function() {
      res.status(204).end();
    })
    .catch(e => handleError(e, req, res, null));
};

/**
 * My info
 */
const me = function(req, res, next) {
  const userId = req.user ? req.user.id: null;
  if(!userId) return res.status(401).end();

  return User.find({
    where: {
      id: userId
    },
    attributes: [ 'id', 'name', 'email', 'profileUrl', 'photo', 'githubUsername', 'role' ]
  })
    .then(user => { // don't ever give out the password or salt
      if(!user) {
        return res.status(401).end();
      }
      res.json(user);
    })
    .catch(e => handleError(e, req, res, null));
};



const saveProfileImageUrl = function (req, res, next) {
  if(!req.user) return handleError(null, req, res, 401);
  const userId = req.user.id;
  const photo = req.body.photo;
  User.update({photo}, {
    limit: 1,
    where: { id: userId }
  })
    .then(() => res.json({result: "profile photo changed"}))
    .catch(e => handleError(e, req, res, null));
};


const addFakeUser = function (req, res) {
  const githubUsername = req.query.fakeuser;
  const options = {
    uri: `https://api.github.com/users/${githubUsername}`,
    qs: {
      client_id: config.github.clientID,
      client_secret: config.github.clientSecret
    },
    headers: {
      'User-Agent': 'Request-Promise'
    },
    json: true
  };

  request(options)
    .then(user => {
      const userInfo = {
        name: user.name,
        email: user.emails,
        profileUrl: user.url,
        username: user.login,
        githubUsername: user.login,
        photo: user.avatar_url
      };
      User.create(userInfo)
        .then(user => {
          passportConfig.getRepos(user);
          res.redirect('/portfolio/' + user.id);
        });
    });
};

module.exports = {
  index,
  show,
  destroy,
  me,
  saveProfileImageUrl,
  addFakeUser
};