var Chance = require('chance');
var chance = new Chance();

const express = require('express')
const app = express()

app.get('/', (req, res) => {
  res.send(generateEmployees());
});

app.listen(3000, () => {
  console.log('Accepting HTTP requests on port 3000.');
});

function generateEmployees() {

	var numberOfEmployees = chance.integer({
		min: 0,
		max: 5
	});
	console.log(numberOfEmployees);
	var employees = [];
	for (var i = 0; i < numberOfEmployees; ++i) {
		var gender = chance.gender();
		var birthdate = chance.birthday({string: true, american: false});
		var name = chance.name({ gender: 'male' });
		var ssn = chance.ssn();
		var company = chance.company();
		var address = chance.address();
		employees.push({
			gender: gender,
			birthdate: birthdate,
			name: name,
			ssn: ssn,
			company: company,
			address: address
		});
		
	};
	console.log(employees);
	return employees;
}
