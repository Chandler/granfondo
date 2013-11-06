require 'rubygems'
require 'json'
require 'open-uri'
require 'CSV'
require 'chronic'
require 'chronic_duration'

# ##build geo data

root = 'http://ridewithgps.com/routes/'

route_ids = {
  "gran" => 733774,
  "chandler" => 709516,
  "medio" => 709525,
  "medio_wc" => 689185,
  "piccolo" => 604436
}

geo_json = {
  "type" => "FeatureCollection",
  "features" =>[]
}

#fetch gps data and construct geojson object
route_ids.each do |route, id|
  url = root + id.to_s + ".json"
  
  puts "fetching " + route + " data"
  puts "GET " + url
  
  json = JSON.parse(open(url).read)
  geo_json["features"] << {
    "type" => "Feature",
    "properties" => {
      "name" => route
    },
    "geometry" => {
      "type" => "LineString",
      "coordinates" => json["track_points"].map { |m| [m["x"], m["y"]] }
    }
  }
end

# File.open('geo.json', 'w') {|f| f.write(JSON.pretty_generate(geo_json)) }

# ##build rider data
riders = {}

CSV.foreach("riders.csv") do |row|
  if row[0] == nil || row[1] == nil ||  row[2] == nil ||  row[3] == nil ||  row[4] == nil ||  row[5] == nil || row[6] == nil
    next
  end
  name = row[0]
  start_time_seconds_epoch = Time.parse(row[3]).to_i #date agnostic
  clock_time_seconds = ChronicDuration.parse(row[6])
  category = row[2].downcase
  bib = row[4]

  if (category.include? "male")
   gender = "male"
  elsif (category.include? "female")
   gender = "female"
  else
   gender = "na"
  end


  if (category.include? "gran")
    if (category.include? "wc")
      route = "gran_wc"
    else
      route = "gran"
    end
  elsif (category.include? "medio")
    
    if (category.include? "wc")
      route = "medio_wc"
    else
      route = "medio"
    end
  elsif (category.include? "piccolo")
    route = "piccolo"
  else
    next
  end

  riders[route] ||= []
  riders[route] << {
    "name" => name,
    "bib" => bib,
    "wall_clock_seconds" => clock_time_seconds
  }

end

File.open('data.json', 'w') {|f| f.write(JSON.pretty_generate(geo_json.merge(riders))) }












