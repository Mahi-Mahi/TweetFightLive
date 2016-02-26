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
var credis = redis.createClient(); //creates a new client

var config = JSON.parse(require('fs').readFileSync(process.argv[2], 'utf8'));

var keywords = config.keywords;
keywords = keywords.filter(function(elem, pos) {
	return keywords.indexOf(elem) == pos;
});

var re = RegExp(keywords.join('|'), 'i');

var timestamp = function() {
	var t = Math.floor(Date.now() / 1000 / period);
	return t;
};
var previous_timestamp = function(n) {
	return timestamp() - n;
};

var period = 10;
var ratio = [1, 0.5, 0.2, 0.1];

var summarize = function(credis, keyword, total, n, cb) {

	// console.log("summarize", keyword, total, n);

	if (n < ratio.length) {

		credis.scard(keyword + '/' + previous_timestamp(n), function(err, res) {

			if (res) {
				summarize(credis, keyword, total + (res * ratio[n]), n + 1, cb);
			} else {
				cb(total);
			}

		});
	} else {

		cb(total);

	}

};

var current;
var scores = {};

credis.on('connect', function() {
	console.log('connected');

	credis.flushall(function(err, res) {

		keywords.forEach(function(keyword) {
			console.log(keyword);
			credis.set('kwd/' + keyword + '/total', 0);
		});

		var Twitter = require('node-tweet-stream'),
			t = new Twitter({
				consumer_key: 'IxaMqu3dzMq124EuqKpg',
				consumer_secret: 'GyYvjFjy8kXdpMzpsRzcppD1TnnWa8kBRfuOEHfpkNs',
				token: '1501751-DWOxQ4iGLhASly8E7Dx8yeZvoJK83doOdMPmf1ob5E',
				token_secret: 'H9OV55BYs96ldaQ3VGPmTYsua37fQEUbbK0y1iHiMAVWR'
			});

		t.on('tweet', function(tweet) {

			if (tweet.lang != 'fr')
				return;

			var match = tweet.text.match(re);
			if (match) {

				console.log(match[0]);

				credis.set('tweet/' + tweet.id_str, tweet);

				var keyword = 'kwd/' + match[0].toLowerCase();

				// console.log(keyword);

				credis.sadd(keyword + '/' + timestamp(), tweet.id_str, function(err, res) {
					// console.log('>>', keyword + '/' + timestamp(), res);
				});

				summarize(credis, keyword, 0, 0, function(res) {

					credis.set(keyword + '/live', res);

					scores[keyword.substr(4)] = res;

					io.emit('scores', JSON.stringify(scores));

				});

			}
		});

		t.on('error', function(err) {
			console.log('Oh no');
		});

		keywords.forEach(function(item) {
			t.track(item);
		})
	});
});

http.listen(3000, function() {
	console.log('listening on *:3000');
});