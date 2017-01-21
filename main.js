var map;
var openInfowindow;
var previous_pos = 0;
var locations;

// var flightPath;
var markers = [];
var infowindows = [];
var circles = [];

function getLocationTuple(location){
  return (location.get("location").latitude+"").slice(0,10) + "," + (location.get("location").longitude + "").slice(0,10);
}
function list_locations() {
  // var locationsHere = {};
  console.log(locations);
  // _.each(locations, function(location){
  //   console.log(getLocationTuple(location));
  //   locationsHere[getLocationTuple(location)] = (locationsHere[getLocationTuple(location)] || 0) + 1;
  // });
  _.each(locations, function(location, idx){
    $('<a href="#" class="list-group-item" onclick="show_pos('+ idx +')">'
      + moment(location.get("time_start")).calendar()
      + ' - '
      + moment(location.get("time_end")).calendar()
      // +'<span class="badge">'
      // + (locationsHere[getLocationTuple(location)])
      // +'</span>'
      +'</a>'
    ).appendTo(".locations-list");
  });
}

function change_pos(val){
  show_pos(previous_pos + val);
}
function show_pos(i){
  i = i || 0;
  if(i == locations.length)
    i = 0;
  if(i < 0)
    i = locations.length - 1;

  console.log(markers[i]);
  console.log(locations[i]);
  map.setCenter(new google.maps.LatLng(
    locations[i].get("location").latitude,
    locations[i].get("location").longitude)
  );
  markers[i].setIcon('https://maps.google.com/mapfiles/ms/icons/yellow-dot.png');
  if(previous_pos == 0)
    markers[0].setIcon('https://maps.google.com/mapfiles/ms/icons/green-dot.png');
  else if (previous_pos == locations.length - 1)
    markers[locations.length - 1].setIcon('https://maps.google.com/mapfiles/ms/icons/purple-dot.png');
  else
    markers[previous_pos].setIcon('https://maps.google.com/mapfiles/ms/icons/red-dot.png');

  if(openInfowindow)
    openInfowindow.close();
  // if(lastClicked == i){
    // if(circles[i].getMap() == null){
    //   circles[i].setMap(map);
    //   infowindows[i].open(map, markers[i]);
    // }
    // else circles[i].setMap(null);
  // }
  // else{
    infowindows[i].open(map, markers[i]);
  // }
  previous_pos = i;
  openInfowindow = infowindows[i];

}

function compute_distance(a, b){
  var km = a.get("location").kilometersTo(b.get("location"));
  // console.log(dist);
  return km * 1000;
}
function getBucket(x){
  if(x <= 3) return x;
  if(x <= 10) return "3-10m";
  if(x <= 20) return "10-20m";
  if(x <= 100) return "20-100m";
  if(x <= 200) return "100-200m";
  if(x <= 300) return "200-300m";
  if(x <= 400) return "300-400m";
  if(x <= 500) return "400-500m";
  if(x <= 1000) return "500-1000m";
  return "1001+ m";
}
function analyze_dist(){
  var distances = {}, list = [];
  for(var i = 1; i < locations.length; i++){
    var dist = compute_distance(locations[i], locations[i-1]);
    list.push(dist);
    distances[getBucket(dist)] = 1 + (distances[getBucket(dist)] || 0);
  }
  // console.log(distances);
  $(".modal-body>p").remove();
  $("<p>Mean: "+_.mean(list)+"</p>").appendTo(".modal-body");
  _.each(Object.keys(distances).sort(function(a, b){
      a = a.substr(a.search("-")+1).replace ( /[^\d.]/g, '' );
      b = b.substr(b.search("-")+1).replace ( /[^\d.]/g, '' );
      return parseInt(a) - parseInt(b);
    }), function(key){
      var text = (key + ": " + distances[key] + '\n');
      $("<p style='margin:0px'>"+text+"</p>").appendTo(".modal-body");
    });
  $("<br>").appendTo(".modal-body");
  // $("<p>Median: "+_.median(list)+"</p>").appendTo(".modal-body");
  $("<p>Real distances: <br>"+list.sort().join("<br>")+"</p>").appendTo(".modal-body");
  $("#myModal").modal("show");
  $(".modal-backdrop.in").hide();
}

function plotArray(){
  var array = JSON.parse(prompt("give me the json array: "));
  if(!array) return;
  console.log(array);
  array = array["array"];
  plotPinsAndCircles(array);
}

function clearMap(){
  // $("#parse_id").val('');
  $("input[name='timeStart']").val('');
  $("input[name='timeEnd']").val('');
  localStorage["lastId"] = '';
  localStorage["lastTimeStart"] = '';
  localStorage["lastTimeEnd"] = '';
  deleteMarkers();
}
function latestLocations(){
  query_latest_locations();
}
function refresh(){
  deleteMarkers();
  query_parse();
}

function initialize_map() {
  var mapOptions = {
    zoom: 14,
    center: new google.maps.LatLng(44.432701, 26.103695),
    mapTypeId: google.maps.MapTypeId.ROADMAP
  };

  map = new google.maps.Map(document.getElementById('map-canvas'),
      mapOptions);
  if(localStorage["lastId"]){
    $("#parse_id").val(localStorage["lastId"]);
    $("input[name='timeStart']").val(localStorage["lastTimeStart"]);
    $("input[name='timeEnd']").val(localStorage["lastTimeEnd"]);
    query_parse();
  }
}

google.maps.event.addDomListener(window, 'load', initialize_map);
Parse.initialize("XxAKpRlTJIny9YsHIb1bdoCuWJhm4InfOgI2GvWB", "YIyH7FMxqvvCBPvbgecPiy7qcXeqa2lR00k3xhcA");
$("input[name='timeStart']").datetimepicker();
$("input[name='timeEnd']").datetimepicker();

var nickname_hash = {
  "Laur": "062fD4ZI73",
  "Antonio": "CVgQg6RtAQ",
  "Alex": "YtYnzJwAoM",
  "Bianca": "aRkVut5mHn",
  "Isabella": "szxW8h7904",
  "fata1": "ZdwGeP8zlK",
  "Bogdan": "EIxcvQA5J6",
  "Vlad": "DYoEoqz71C",
  "Dorian": "97mX1dB5ay"
};

function query_latest_locations(){
  var query = new Parse.Query("_User");

  var timeStart = $("input[name='timeStart']").val();
  localStorage["lastTimeStart"] = timeStart;
  if(timeStart)
    timeStart = moment(timeStart);
  else
    timeStart = moment().startOf('day');

  query.greaterThan("updatedAt", timeStart.toDate());
  query.descending("updatedAt");
  query.limit(1000);
  query.find()
    .then(function(results){
      results.reverse();
      console.log(results);
      console.log(results.length + " users fetched.");
      if(results.length == 0){
        alert("No users that updated their location in this time range. Change the starting time (first textbox)");
      }

      showLocations(results);
    },
    function(error){
      console.log("users query error: " + error.message);
    }
  );
}

function query_parse(){
  var query = new Parse.Query("Locations");

  var parse_id = $("#parse_id").val();
  parse_id = nickname_hash[parse_id] || parse_id;

  if(parse_id)
    query.equalTo("user_id", parse_id);

  var timeEnd = $("input[name='timeEnd']").val();
  localStorage["lastTimeEnd"] = timeEnd;
  if(!timeEnd)
    timeEnd = moment().endOf('day');
  else timeEnd = moment(timeEnd);
  query.lessThan("time_end", timeEnd.toDate());

  var timeStart = $("input[name='timeStart']").val();
  localStorage["lastTimeStart"] = timeStart;
  if(timeStart){
    timeStart = moment(timeStart);
    query.greaterThan("time_start", timeStart.toDate());
  }
  else {
    timeStart = moment().startOf('day');
    query.greaterThan("time_end", timeStart.toDate());
  }

  query.descending("time_start");
  query.limit(1000);
  query.find()
    .then(function(results){
      results.reverse()
      console.log(results);
      console.log(results.length + " locations fetched.");
      if(results.length == 0){
        alert("No locations in this time range for that user");
      }
      locations = results;
      load_data();
      if(window.screen.width > 500)
        list_locations();
      // analyze_dist();
    },
    function(error){
      console.log("locations query error: " + error.message);
    }
  );
}


$("#submit_button").click(query_parse);
$("#parse_id").keyup(function(e){
  if(e.keyCode == 13)
  {
      refresh();
  }
});

$("input[name='timeStart']").on('input', function(e) {
  localStorage["lastTimeStart"] = $("input[name='timeStart']").val();;
});

$("input[name='timeEnd']").on('input', function(e) {
  localStorage["lastTimeEnd"] = $("input[name='timeEnd']").val();;
});

$("#parse_id").on('input', function(e) {
  localStorage["lastId"] = $("#parse_id").val();
});







function plotPinsAndCircles(objects){
  // var circles = [];
  map.setCenter(new google.maps.LatLng(
    objects[objects.length - 1]["latitude"],
    objects[objects.length - 1]["longitude"])
  );
  for(var i = 0; i < objects.length; i++){
    var object = objects[i];
    console.log(object);
    var newMarker = function(icon){
      return new google.maps.Marker({
        position: new google.maps.LatLng(object["latitude"],  object["longitude"]),
        map: map,
        icon: icon,
        title: "#" + (i + 1)
            + '\n'
            + '\n' + object["name"]
            + '\n' + object["radius"]
      })
    };
    markers.push(newMarker('https://maps.google.com/mapfiles/ms/icons/red-dot.png'));
    circles.push(new google.maps.Circle({
      strokeColor: '#AAAAAA',
      strokeOpacity: 0.7,
      strokeWeight: 1,
      fillOpacity: 0.05,
      map: map,
      radius: parseInt(object["radius"]),
      fillColor: '#2196F3'
    }));
    circles[i].bindTo('center', markers[i], 'position');
    circles[i].setMap(map);
  }
}


function showLocations(users){
  for(var i = 0; i < users.length; i++){
    var user = users[i];
    if(!user || !user.get("location")) continue;
    var newMarker = function(icon){
      return new google.maps.Marker({
        position: new google.maps.LatLng(user.get("location").latitude,  user.get("location").longitude),
        map: map,
        icon: icon,
        title: "#" + (i + 1)
            + '\n'
            + '\n' + moment(user.get("updatedAt")).calendar()
            + '\n'
            + '\n --'
            + '\n' + "user_id: " + user.id
            + '\n' + "user_name: " + user.get("usr_name")
      })
    };
    markers.push(newMarker('https://maps.google.com/mapfiles/ms/icons/red-dot.png'));
    var contentString = '<div id=content>'
      + "#" + (i + 1)
      + '<br/>'
      + '<br/>' + moment(user.get("updatedAt")).calendar()
      + '<br/> --'
      + '<br/>' + "user_id: " + user.id
      + '<br/>' + "user_name: " + user.get("usr_name")
      + '</div>';
    infowindows.push(new google.maps.InfoWindow({
      position: new google.maps.LatLng(
        user.get("location").latitude,
        user.get("location").longitude),
      content: contentString,
      maxWidth: 200
    }));
    google.maps.event.addListener(markers[i], 'click', _.partial(function(i){
      return function(){
        // if(openInfowindow)
        //   openInfowindow.close();
        // if(lastClicked == i){
        //   // if(circles[i].getMap() == null){
        //   //   circles[i].setMap(map);
        //   //   infowindows[i].open(map, markers[i]);
        //   // }
        //   // else circles[i].setMap(null);
        // }
        // else{
        //   infowindows[i].open(map, markers[i]);
        // }
        // lastClicked = i;
        // openInfowindow = infowindows[i];
        show_pos(i);
      };
    })(i));
  }
}

function load_data(){
  var flightPlanCoordinates = [];

  map.setCenter(new google.maps.LatLng(
    locations[locations.length - 1].get("location").latitude,
    locations[locations.length - 1].get("location").longitude)
  );
  map.setZoom(15);

  for(var i = 0; i < locations.length; i++){
    var seconds = locations[i].get("time_spent")/1000;
    var minutes = seconds/60;
    var hours = minutes/60;
    var days = hours/24;
    var spent;
    if(days >= 1) spent = days + " days";
    else if(hours >= 1) spent = hours + " hours";
    else if(minutes >= 1) spent = minutes + " minutes";
    else spent = seconds + " seconds";

    var newMarker = function(icon){
      return new google.maps.Marker({
        position: new google.maps.LatLng(locations[i].get("location").latitude,  locations[i].get("location").longitude),
        map: map,
        icon: icon,
        title: "#" + (i + 1)
            + '\n'
            + '\n' + moment(locations[i].get("time_start")).calendar()
            + ' - ' + moment(locations[i].get("time_end")).calendar()
            + '\n' + spent
            + '\n'
            + '\n' + locations[i].get("near_location_name")
            + '\n' + "approx distance: "
              + locations[i].get("near_location_distance")
            + '\n --'
            + '\n' + "accuracy: " + locations[i].get("accuracy") + "m"
            + '\n' + "updateTime: "
              + moment(locations[i].get("updateTime")).calendar()
            + '\n' + "broadcastTime: "
              + moment(locations[i].get("broadcastTime")).calendar()
            + '\n' + "user_id: " + locations[i].get("user_id")
      })
    };
    if(i == 0){
      markers.push(newMarker('https://maps.google.com/mapfiles/ms/icons/green-dot.png'));
    }
    else if(i == locations.length - 1){
      markers.push(newMarker('https://maps.google.com/mapfiles/ms/icons/purple-dot.png'));
    }
    else {
      markers.push(newMarker('https://maps.google.com/mapfiles/ms/icons/red-dot.png'));
    }
    circles.push(new google.maps.Circle({
      strokeColor: '#AAAAAA',
      strokeOpacity: 0.7,
      strokeWeight: 1,
      fillOpacity: 0.05,
      map: map,
      radius: locations[i].get("accuracy"),    // x miles in metres
      fillColor: (locations[i].get("accuracy") == 200
       || locations[i].get("accuracy") == 69)?'#21F321':'#2196F3' //geofence
    }));
    circles[i].bindTo('center', markers[i], 'position');

    var contentString = '<div id=content>'
      + "#" + (i + 1)
      + '<br/>'
      + '<br/>' + moment(locations[i].get("time_start")).calendar()
      + ' - ' + moment(locations[i].get("time_end")).calendar()
      + '<br/>' + spent
      + '<br/>'
      + '<br/>' + locations[i].get("near_location_name")
      + '<br/>' + "approx distance: "
        + locations[i].get("near_location_distance")
      + '<br/> --'
      + '<br/>' + "accuracy: " + locations[i].get("accuracy") + "m"
      + '<br/>' + "updateTime: "
        + moment(locations[i].get("updateTime")).calendar()
      + '<br/>' + "broadcastTime: "
        + moment(locations[i].get("broadcastTime")).calendar()
      + '<br/>' + "user_id: " + locations[i].get("user_id")
      + '</div>';
    infowindows.push(new google.maps.InfoWindow({
      position: new google.maps.LatLng(
        locations[i].get("location").latitude,
        locations[i].get("location").longitude),
      content: contentString,
      maxWidth: 200
    }));
    google.maps.event.addListener(markers[i], 'click', _.partial(function(i){
      return function(){
        show_pos(i);
      };
    })(i));

    flightPlanCoordinates.push(new google.maps.LatLng(
      locations[i].get("location").latitude,
      locations[i].get("location").longitude));
  }

  window.flightPath = new google.maps.Polyline({
    path: flightPlanCoordinates,
    geodesic: true,
    strokeColor: '#FF0000',
    strokeOpacity: 0.7,
    strokeWeight: 2
  });
  window.flightPath.setMap(map);
}

// Sets the map on all markers in the array.
function setAllMap(map) {
  for (var i = 0; i < markers.length; i++) {
    markers[i].setMap(map);
    if(circles[i])
      circles[i].setMap(map);
    // infowindows[i].setMap(map);
  }
  if(!window.flightPath) return;
  window.flightPath.setMap(map);
}

// Removes the markers from the map, but keeps them in the array.
function clearMarkers() {
  setAllMap(null);
}

// Shows any markers currently in the array.
function showMarkers() {
  setAllMap(map);
}

// Deletes all markers in the array by removing references to them.
function deleteMarkers() {
  clearMarkers();
  locations = null;
  markers = [];
  circles = [];
  infowindows = [];
  openInfowindow = null;
  window.flightPath = null;
}
