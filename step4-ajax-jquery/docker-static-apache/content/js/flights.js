$(function() {
	console.log("Loading flights...");
	
	function loadFlights() {
		$.getJSON("/api/json/", function( flights ) {
			console.log(flights);
			var message = "No flights recorded...";
			if (flights.length > 0) {
				message = "Airline: " + flights[0].airline + ", Callsign:  " +
					flights[0].callsign + ", FlightId: " + 
					flights[0].flightId + ", Current Coords: " +
					flights[0].currentCoords + ", Pilot Name: " + 
					flights[0].pilot + ", License Expiration Date: " +
					flights[0].licenseExpireDate; 
			}
			$(".json-app").text(message);
		});
	};
	loadFlights();
	setInterval(loadFlights, 2000);
});
