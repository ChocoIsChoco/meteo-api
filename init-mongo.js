
db = db.getSiblingDB('meteo_api');


db.test.insertOne({
  message: "Initialisation",
  created: new Date()
});

print("Base meteo_api créée");
