angular.module('app', []);

angular.module('app').constant('DATA_SOURCES',
    ["data/MUNI.json", "data/BART.json", "data/CalTrain.json"]
    );

angular.module('app').controller('AppCtrl', ['$scope', 'DATA_SOURCES', function($scope, DATA_SOURCES) {

    // Load the data for each agency
    var agencyData = {};
    var numberAgenciesLoaded = 0;
    DATA_SOURCES.forEach(function (agencySource, i) {
        d3.json(agencySource, function(error, agency) {
            var agencyName = agency['agency_name'];
            agencyData[agencyName] = agency;
            // TODO(@dan): rename agency_name in source to just 'name'??
            agencyData[agencyName].name = agencyName;
            numberAgenciesLoaded += 1;
            if (numberAgenciesLoaded === DATA_SOURCES.length) {
                $scope.agencies = agencyData;
                $scope.$apply();
            }
        });
    });


    // Load and show the map of CA
    d3.json("data/ca-topo.json", function (error, ca_topojson){
        map_data = ca_topojson;
        
        $scope.map_projection = d3.geo.albers().parallels([37.69,37.77]).scale(23000).translate([8000,1020]);

        // Draw the coastline of the bay area
        map_svg = d3.select("#map svg");
        map_svg.append("path")
        .attr("class","landmass")
        .datum(topojson.feature(map_data, map_data.objects.ca))
        .attr("d", d3.geo.path().projection($scope.map_projection));
        
        // Path that will show the route of the line we're looking at:
        map_svg.append("path").attr("class", "route-line"); 
    });

    // Returns whether the given route ID is selected
    $scope.isRouteSelected = function(routeId){
        return (routeId == $scope.activeRoute);
    }

    // Returns whether the given agency  is selected
    $scope.isAgencySelected = function(agencyName){
        return (agencyName == $scope.activeAgency);
    }

    // Display the Graph for a particular route
    $scope.displayRoute = function(agencyName, routeId, params) {
        console.log("Showing %s route %s", agencyName, routeId);
        
        console.log("event = %o", $scope);

        $scope.activeRoute = routeId;
        $scope.activeAgency = agencyName;

        // grab our data
        var route = agencyData[agencyName].routes[routeId];
        var stops = route['stop_ids'].map(function(stop_id){
            return agencyData[agencyName].stops[stop_id];
        });

        // dimensions
        var w = 580,
            h = 460,
            hMargin = 65,
            vMargin = 20,
            dotRadius = 3,
            colors = ['#1fbba6', '#ff7f66', '#8560a8'],
            years = Object.keys(stops[0].median_income),
            numberOfYears = years.length,
            moneyFormat = d3.format(",.2f"),
            yScale = d3.scale.linear().domain([200000, 0]).range([10, h - vMargin]),
            xScale = d3.scale.linear().domain([0, stops.length]).range([hMargin, w - hMargin]),
            xAxis = d3.svg.axis().scale(xScale).orient("bottom").ticks(stops.length).tickFormat(function(d, i) {
              if (stops[i]) {
                return stops[i].name;
              }
            }),
            yAxis = d3.svg.axis().scale(yScale).orient("left").ticks(8).tickFormat(function(d, i) {return "$" + d / 1000 + "K";});

        // Initial setup
        if(!$scope.didSetUpGraph){
            graph_container = d3.select("#graph");
            graph_container.html(""); // Empty what was there initially
            graph_container.append("h3").attr("class", "route-name"); // Heading at the top

            // The main SVG where we draw stuff
            svg =  graph_container.append("svg:svg")
            .attr("width", w)
            .attr("height", h + 100);

            graph_container.append("div").attr("id","tooltip"); // Hovering tooltip
            svg.append("g").attr("class","data-dots"); // Graph dots

            svg.append("text")
            .attr("class", "y-axis-label")
            .text("Median Household Income")
            .attr("text-anchor", "middle")
            .attr("transform", "translate(12,"+((h/2)-(vMargin/2))+"), rotate(-90)");

            $scope.didSetUpGraph = true;
        }

        var svg = d3.select("#graph").selectAll("svg");
        var heading = d3.select("#graph").selectAll("h3");
        var tooltip = d3.selectAll("div#tooltip");
        var data_dots_group = d3.selectAll("g.data-dots");
        var map_svg = d3.select("#map svg");

        // Heading
        heading.html(agencyName+" <small>"+route.name+"</small>");

        // Axes
        svg.selectAll("g.axis").remove();

         // X axis elements
         svg.append("g")
         .attr("class", "axis x-axis")
         .attr("transform", "translate(0," + (h - vMargin) + ")")
         .call(xAxis)
         .selectAll("text")
         .style("text-anchor", "end")
         .attr("dy", "-.5em")
         .attr('dx', "-1em")
         .attr("transform", "rotate(-80)")
         .call(xAxis);

        // Y axis elements
        svg.append("g")
        .attr("class", "axis y-axis")
        .attr("transform", "translate(" + hMargin + ",0)")
        .call(yAxis);

        // Data line
        var yearIndex = 0;
        // Delete the lines from the previous graph
        svg.selectAll("path.data-line").remove();
        // Loop through every year
        for(yearIndex = 0; yearIndex < numberOfYears; yearIndex++) {
          // Create the line
          var line = d3.svg.line()
            .interpolate("cardinal")
            .x(function(d, i) { return xScale(i);})
            .y(function(d, i) { return yScale(d.median_income[years[yearIndex]]);});

          // Append the line to the graph
          svg.insert("path", 'g.data-dots' )
            .attr("class", "data-line")
            .transition()
            .attr("d", line(stops))
            .style("stroke", colors[yearIndex]);
        }


        // Dots for stops
        data_dots_group.selectAll("circle").remove();
        var circles = data_dots_group.selectAll("circle");
        // Create the dots for each stop in each year
        for(yearIndex = 0; yearIndex < numberOfYears; yearIndex++) {
            circles.data(stops)
            .enter()
            .append("circle")
            .attr("fill", colors[yearIndex])
            .attr("stroke", "white")
            .attr("data-year", years[yearIndex])
            .attr('data-stop-id', function(d, i) {return i;})
            .transition()
            .attr("cx", function(d, i) {return xScale(i);})
            .attr("cy", function(d, i) {return yScale(d.median_income[years[yearIndex]]);})
            .attr("r", dotRadius);
        }

        data_dots_group.selectAll("circle").on("mouseover", function(d, i) {
          var stop = stops[this.getAttribute('data-stop-id')],
              year = this.getAttribute('data-year'),
              fipsInfo = stop.fips_info[year];

          tooltip.html(function() {
            tooltip_html = "<strong>" + stop.name + "</strong><br/>";
            tooltip_html += "Median income: <br/>";
            for (var year in stop.median_income) {
                if(stop.median_income.hasOwnProperty(year)) {
                    tooltip_html += "<strong>" + year + ":</strong> $" + moneyFormat(stop.median_income[year]) + "<br/>";
                }
            }
            tooltip_html += "Census Tract: " + fipsInfo.state_fips + fipsInfo.county_fips + fipsInfo.tract_fips;
            return tooltip_html;
          })
          .style("left", (d3.event.pageX) + "px")
          .style("top", (d3.event.pageY) + "px");

          tooltip.style("visibility", "visible");
          this.setAttribute("r", 7);

          marker_coords = $scope.map_projection([stop.lon, stop.lat]);
          map_svg.select("circle.stop-marker").remove();
          circle = map_svg.append("circle")
            .attr("class", "stop-marker")
            .attr("r", 3)
            .attr("fill",colors[0])
            .attr("cx",marker_coords[0])
            .attr("cy",marker_coords[1]);
        })
        .on("mousemove", function() {
            tooltip.style("top", (event.pageY - $("body").scrollTop() - 10) + "px")
            .style("left", (event.pageX + 6) + "px");
        })
        .on("mouseout", function() {
            tooltip.style("visibility", "hidden");
            this.setAttribute("r", dotRadius);
            map_svg.select("circle.stop-marker").remove();
        });

        // Update the map to show this route
        var route_line = d3.svg.line().x(function(d){return d[0];}).y(function(d){return d[1];}).interpolate("cardinal");

        // Project lat->lng into coordinates to display on the map
        positions = stops.map(function(stop){return $scope.map_projection([stop.lon, stop.lat]);});

        map_svg.select("path.route-line")
        .transition()
        .attr("d", route_line(positions))
        .attr("stroke", colors[0]);

    };
}]);
