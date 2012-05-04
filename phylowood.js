// SETTINGS
var width = 800;
var height = 600; 
var x = d3.scale.linear().range([0,width]);
var y = d3.scale.linear().range([0,height]);

// INPUT
var geoCoords = [[10.0,8.0], [11.0,8.5]];
var geoData = [[0,1], [1,1]];
var newickStr = "(A:10.0,B:11.0);";

// GEO 
function Geography(geoCoords) {
  this.geoCoords = geoCoords;
  var distances = function() {
  };
}

function Area(geoData) {

};

// TREE
function Tree(newickStr) {

};

// MAIN
var myGeography = new Geography();
