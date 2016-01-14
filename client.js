"use strict";
/* global io */
/* global d3 */

var width = 960,
	height = 500,
	radius = Math.min(width, height) / 2;

var color = d3.scale.category20();

var pie = d3.layout.pie()
	.value(function(d) {
		return d.score;
	})
	.sort(null);

var arc = d3.svg.arc()
	.innerRadius(radius - 100)
	.outerRadius(radius - 20);
var labelArc = d3.svg.arc()
	.outerRadius(radius - 40)
	.innerRadius(radius - 40);

var svg = d3.select("body").append("svg")
	.attr("width", width)
	.attr("height", height)
	.append("g")
	.attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

function arcTween(a) {
	var i = d3.interpolate(this._current, a);
	this._current = i(0);
	return function(t) {
		return arc(i(t));
	};
}

var socket = io();
socket.on('scores', function(msg) {
	var scores = JSON.parse(msg);
	var data = [];
	for (var keyword in scores) {
		if (scores.hasOwnProperty(keyword)) {
			data.push({
				label: keyword,
				score: scores[keyword]
			});
		}
	}

	svg
		.datum(data)
		.selectAll("path")
		.data(pie)
		.enter()
		.append("path")
		.attr("fill", function(d, i) {
			return color(i);
		})
		.attr("d", arc)
		.each(function(d) {
			this._current = d;
		})
		.append("text")
		.attr("transform", function(d) {
			return "translate(" + labelArc.centroid(d) + ")";
		})
		.attr("dy", ".35em")
		.text(function(d) {
			console.log(d);
			return d.label;
		});

	svg
		.selectAll("path")
		.data(pie)
		.transition()
		.duration(150)
		.attrTween("d", arcTween);

});