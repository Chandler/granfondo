$(document).ready(function () {
  var width  = 1100;
  var height = 800;
  var json;
  var group;
  var highlighted_rider_ids = []; //Twicycles crew ["5084","5501","5857","3237","2996"]
  var first_pass = true;
  var speed_up_factor = 3; //multiplier for animation speed
  var ROUTES = [
    "gran", 
    "gran_wc", 
    "medio",
    "medio_wc",
    "piccolo"]
  
  var ROUTE_COLORS = {
    "gran":     "#1C1C1D",
    "gran_wc":  "#1C1C1D",
    "medio":    "#DD610E",
    "medio_wc": "#DD610E",
    "piccolo":  "#850C29"
  }

  //highlight any users specified in the query string
  var query_ids = Arg('ids');
  if(query_ids && query_ids.length > 0) {
    highlighted_rider_ids = $.map(query_ids, function(id){
      return id.toString().replace(/\//g,''); //remove any slashes that ended up in the query params
    })
  }

  console.log(highlighted_rider_ids)

  $('.restart').on('click', function(){
    drawCircles({});
  })

  $('select').on('change', function(evt, params) {
    //add or remove id from highlighted_rider_ids 
    if(params["selected"]) {
      highlighted_rider_ids.push(params["selected"])
    }
    
    if(params["deselected"]) {
      var index = highlighted_rider_ids.indexOf(params["deselected"]);
      if (index > -1) {
          highlighted_rider_ids.splice(index, 1);
      }
    }
    //calculate new url based on the contents of highlighted_rider_ids
    var new_params = Arg.stringify({ids: highlighted_rider_ids});
    window.history.pushState("", "", window.location.href.split('?')[0] + "?" + new_params);
    // drawCircles({});
  });


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

    
    drawCircles({first_pass: true});
    
    $(".chosen-select").chosen({
      width: 600,
      max_selected_options: 20
    });
  });

  var drawCircles = function(options) {
    group = vis.append("svg:g");
    d3.selectAll('circle').remove();
    d3.selectAll('text').remove();
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
        var name           = riders[j]["name"];
        var bib            = riders[j]["bib"];
        var speed          = riders[j]["wall_clock_seconds"];
        var rounded_speed  = Math.floor((speed/80))*80; //round for grouping
        var is_highlighted = highlighted_rider_ids.indexOf(bib) > -1;
        
        if(options["first_pass"]){
          //render dropdown select
          var option_string = is_highlighted ? "<option selected></option>" : "<option></option>";
          $('select').append($(option_string).text(name).val(bib));
        }

        //Always draw a rider who is being highlighted
        if(is_highlighted) {
          radius = 8;
        } else {
          //one draw one circle for each distinct rounded_speed per route
          if (deduplicater[route][rounded_speed]){
            continue;
          }else {
            deduplicater[route][rounded_speed] = true;
          }
          radius = 2.5;
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
          .duration(rounded_speed*speed_up_factor)
          .ease("linear")
          .attrTween("transform", function (d, index) {
            var nodes = pathNodes[this.getAttribute('route')];
            return function (t) {
              var p = nodes.getPointAtLength(nodes.getTotalLength()*t);
              return "translate(" + [p.x, p.y] + ")";
            }
          });


        if(is_highlighted) {
          var text = group.append("text")
            .attr({
              route: route,
              name: name,
              transform: function () {
                var nodes = pathNodes[this.getAttribute('route')];
                var p = nodes.getPointAtLength(0)
                return "translate(" + [p.x, p.y] + ")";
              }
            })
            .text( function (d) { return this.getAttribute('name').split(' ')[0]; })

          text.transition()
            .duration(rounded_speed*speed_up_factor)
            .ease("linear")
            .attrTween("transform", function (d, index) {
              var nodes = pathNodes[this.getAttribute('route')];
              return function (t) {
                var left_anchor = nodes.getPointAtLength((nodes.getTotalLength()*t)-15);
                var right_anchor = nodes.getPointAtLength((nodes.getTotalLength()*t)+15);
                var triangle = constructTriangleFromLine([left_anchor.x,left_anchor.y],[right_anchor.x,right_anchor.y]);
                return "translate(" + [triangle[2][0], triangle[2][1]] + ")";
              }
            });
        }
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

  //porting some trig methods from a python graphics library my roommate wrote
  //https://github.com/isnotinvain/hurrr/blob/master/src/twod.py
  var constructTriangleFromLine = function(pt1, pt2){
    //   return: a list of points that describe an equilteral triangle around the segment from pt1 --> pt2
    var halfHeightVector = [0.57735 * (pt2[1] - pt1[1]), 0.57735 * (pt2[0] - pt1[0])];
    var pt3 = [pt1[0] + halfHeightVector[0], pt1[1] - halfHeightVector[1]];
    var pt4 = [pt1[0] - halfHeightVector[0], pt1[1] + halfHeightVector[1]];
    return [pt2, pt3, pt4];
  };

});













