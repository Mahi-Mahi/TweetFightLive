var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.get('/', function(req, res) {
	res.sendFile(__dirname + '/client.html');
});
app.get('/client.js', function(req, res) {
	res.sendFile(__dirname + '/client.js');
});

io.on('connection', function(socket) {
	console.log('a user connected');

	socket.on('disconnect', function() {
		console.log('user disconnected');
	});
});

var redis = require('redis');
var client = redis.createClient(); //creates a new client

var keywords = ['remaniement', 'uber', 'taxi', 'apocalypse', 'mardi gras', 'nouvel an'];
var re = RegExp(keywords.join('|'), 'i');

var period = 500;
var timestamp = function() {
	var t = Date.now() / period;
	return t;
};

client.on('connect', function() {
	console.log('connected');

	keywords.forEach(function(keyword) {
		client.set(keyword, 0);
		client.expire(keyword, 3600);
	});

	var Twitter = require('node-tweet-stream'),
		t = new Twitter({
			consumer_key: 'IxaMqu3dzMq124EuqKpg',
			consumer_secret: 'GyYvjFjy8kXdpMzpsRzcppD1TnnWa8kBRfuOEHfpkNs',
			token: '1501751-DWOxQ4iGLhASly8E7Dx8yeZvoJK83doOdMPmf1ob5E',
			token_secret: 'H9OV55BYs96ldaQ3VGPmTYsua37fQEUbbK0y1iHiMAVWR'
		});

	t.on('tweet', function(tweet) {

		console.log(tweet.text);

		client.set(tweet.id_str, tweet);
		client.expire(tweet.id_str, 3600);

		var match = tweet.text.match(re);
		if (match) {
			var keyword = match[0].toLowerCase();
			client.incr(keyword);
			client.setnx(keyword + timestamp(), 0);
			client.incr(keyword + timestamp());
		}

		client.mget(keywords, function(err, res) {

			var scores = {};

			res.forEach(function(incr, idx) {
				scores[keywords[idx]] = parseInt(incr, 10);
			});

			io.emit('scores', JSON.stringify(scores));

			console.log(scores);

		});

	});

	t.on('error', function(err) {
		console.log('Oh no');
	});

	keywords.forEach(function(item) {
		t.track(item);
	})
});

http.listen(3000, function() {
	console.log('listening on *:3000');
});