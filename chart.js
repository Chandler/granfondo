$(document).ready(function () {
  var json, map,
  path, vis, xy,
  duration, offset, origin_x, origin_y, len, group, circle;

  var width  = 1100;
  var height = 1100;

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

  d3.json("data.json", function(json) {
    var routes = ["gran", "gran_wc", "medio", "medio_wc","piccolo"]
    // var routes = ["gran_wc","medio_wc"]
    var colors = {
      "gran": "#000",
      "gran_wc": "#000",
      "medio": "#E67C1A",
      "medio_wc": "#E67C1A",
      "piccolo": "#FF0000"
    }
    var path = autoScaledProjection(json);
    var riders = json.riders

    vis = d3.select("#map")
      .append("svg:svg")
      .attr("width", 1100)
      .attr("height", 1100);

    //draw paths
    var i;
    for(i =0; i < json.features.length; i++) {
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

    var pathNodes = function(route) {
      var targetPath = d3.selectAll('.' + route + '_route')[0][0];
      return d3.select(targetPath).selectAll('path').node();
    }

    // Draw circles
    var pathNodes = {}
    var deduplicater = {}
    var count = 0; 
    for(i =0; i < routes.length; i++) {

      var route = routes[i];
      var riders = json[route]
      
      if(!deduplicater[route]){
        deduplicater[route] = []
      } 
      
      var j;
      for(j =0; j < riders.length; j++) {
        var speed = riders[j]["wall_clock_seconds"];
        var rounded_speed = Math.floor((speed/100))*100
        if (deduplicater[route][rounded_speed]){
          console.log("dont draw this rider");
          continue;
        }else {
          deduplicater[route][rounded_speed] = true;
          count = count+1;       
        }

        //lazy load
        if(!pathNodes[route]){
          var targetPath = d3.selectAll('.' + route + '_route')[0][0];
          pathNodes[route] = d3.select(targetPath).selectAll('path').node();
        }

        var circle = group.append("circle")
          .attr({
          r: 2,
          fill: colors[route],
          route: route,
          transform: function () {
              var nodes = pathNodes[this.getAttribute('route')];
              var p = nodes.getPointAtLength(0)
              return "translate(" + [p.x, p.y] + ")";
          }
        });

         circle.transition()
          .duration(speed)
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
    console.log(count)
  });
});