const fs = require('node:fs')
const { getDatabase } = require('../database');


const readFileSensors = async (filename) => {
  try {
    const response = fs.readFileSync(filename, 'utf8');
    const data = JSON.parse(response);
    return data;
  } catch (error) {
    console.error('Erreur de lecture du fichier sensors:', error);
    throw error;
  }
}

const saveSensorsToDb = async (sensorsData) => {
  try {
    const db = getDatabase();
    const results = [];
    

    const windMeasures = {};
    const windUnits = {};
    const otherMeasures = [];
    
    for (const measure of sensorsData.measure) {
      if (measure.name.startsWith('wind_')) {
        const fieldName = measure.name.replace('wind_', '');
        windMeasures[fieldName] = parseFloat(measure.value);
        windUnits[fieldName] = measure.unit;
      } else {
        otherMeasures.push(measure);
      }
    }

    if (Object.keys(windMeasures).length > 0) {
      const windCollection = db.collection('wind');
      const windDocument = {
        date: sensorsData.date,
        ...windMeasures,
        unit_heading: windUnits.heading,
        unit_speed: windUnits.speed_avg
      };
      
      const windResult = await windCollection.insertOne(windDocument);
      console.log('Données vent sauvegardées avec ID:', windResult.insertedId);
      results.push(windResult);
    }

    for (const measure of otherMeasures) {
      const tableName = measure.name;
      const collection = db.collection(tableName);
      
      const document = {
        date: sensorsData.date,
        desc: measure.desc,
        unit: measure.unit,
        value: parseFloat(measure.value)
      };
      
      const result = await collection.insertOne(document);
      console.log(`Donnée ${measure.name} sauvegardée avec ID:`, result.insertedId);
      results.push(result);
    }
    
    return results;
  } catch (dbError) {
    console.error('Erreur de sauvegarde des données du sensors MongoDB:', dbError);
    throw dbError;
  }
}

module.exports = {
  readFileSensors,
  saveSensorsToDb
};
