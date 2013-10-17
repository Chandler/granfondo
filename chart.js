$(document).ready(function () {
  var width  = 1100;
  var height = 800;
  var json;
  var group;
  //var highlighted = ["5084","5501","5857","3237","2996"];
  var highlighted = [];

  var ROUTES = [
    "gran", 
    "gran_wc", 
    "medio",
    "medio_wc",
    "piccolo"]
  
  var ROUTE_COLORS = {
    "gran":     "#38383A",
    "gran_wc":  "#38383A",
    "medio":    "#DD610E",
    "medio_wc": "#DD610E",
    "piccolo":  "#850C29"
  }

  $('.restart').on('click', function(){
    drawCircles();
  })


  d3.json("data.json", function(json) {
    this.json  = json;
    var path   = autoScaledProjection(json);
    var riders = json.riders;

    vis = d3.select("#map")
      .append("svg:svg")
      .attr("width", 1500)
      .attr("height", 1000);

    //draw paths
    for(var i = 0; i < json.features.length; i++) {
      var name = json.features[i].properties.name
      vis.append("svg:g")
        .attr("class", name+"_route")
        .selectAll("path")
        .data([json.features[i]])
        .enter()
        .append("svg:path")
        .attr("d", path)
        .attr("fill-opacity", 0.5)
        .attr("fill", "#fff")
        .attr("stroke", "#333");
    }

    group = vis.append("svg:g");
    drawCircles();
  });


  var drawCircles = function() {
    d3.selectAll('circle').remove();
    var pathNodes    = {};
    var deduplicater = {};
    for(var i = 0; i < ROUTES.length; i++) {
      var route =  ROUTES[i];
      var riders = this.json[route];
      
      if(!deduplicater[route]){
        deduplicater[route] = []
      } 

      for(var j =0; j < riders.length; j++) {
        var radius;
        var bib           = riders[j]["bib"];
        var speed         = riders[j]["wall_clock_seconds"];
        var rounded_speed = Math.floor((speed/80))*80; //round to nearest 100 seconds for grouping
        
        
        //Always draw a rider who is being highlighted
        if(highlighted.indexOf(bib) > -1) {
          radius = 8;
        } else {
          //one draw one circle for each distinct rounded_speed per route
          if (deduplicater[route][rounded_speed]){
            continue;
          }else {
            deduplicater[route][rounded_speed] = true;
          }
          radius = 2;
        }

        //lazy initialize pathnodes for each route
        if(!pathNodes[route]) {
          var targetPath = d3.selectAll('.' + route + '_route')[0][0];
          pathNodes[route] = d3.select(targetPath).selectAll('path').node();
        }

        var circle = group.append("circle")
          .attr({
          r: radius,
          fill: ROUTE_COLORS[route],
          route: route,
          transform: function () {
              var nodes = pathNodes[this.getAttribute('route')];
              var p = nodes.getPointAtLength(0)
              return "translate(" + [p.x, p.y] + ")";
          }
        });

         circle.transition()
          .duration(rounded_speed*2)
          .ease("linear")
          .attrTween("transform", function (d, index) {
            var nodes = pathNodes[this.getAttribute('route')];
            return function (t) {
              var p = nodes.getPointAtLength(nodes.getTotalLength()*t);
              return "translate(" + [p.x, p.y] + ")";
            }
        }); 
      }
    } 
  }

  //http://stackoverflow.com/questions/14492284/center-a-map-in-d3-given-a-geojson-object
  var autoScaledProjection = function(json) {
    var center = d3.geo.centroid(json)
    var scale  = 150;
    var offset = [width/2, height/2];
    var projection = d3.geo.mercator().scale(scale).center(center)
        .translate(offset);

    // create the path
    var path = d3.geo.path().projection(projection);

    // using the path determine the bounds of the current map and use 
    // these to determine better values for the scale and translation
    var bounds  = path.bounds(json);
    var hscale  = scale*width  / (bounds[1][0] - bounds[0][0]);
    var vscale  = scale*height / (bounds[1][1] - bounds[0][1]);
    var scale   = (hscale < vscale) ? hscale : vscale;
    var offset  = [width - (bounds[0][0] + bounds[1][0])/2,
                      height - (bounds[0][1] + bounds[1][1])/2];

    // new projection
    projection = d3.geo.mercator().center(center)
      .scale(scale).translate(offset);
    return path.projection(projection);d
  }
});