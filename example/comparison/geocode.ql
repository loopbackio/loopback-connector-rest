create table google.geocode on
select get from "http://maps.googleapis.com/maps/api/geocode/{format}?sensor=true&latlng={^latlng}"
using defaults format = 'json'
resultset 'results';

return select formatted_address from google.geocode where latlng='40.714224,-73.961452';

