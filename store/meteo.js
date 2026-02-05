const { getDatabase } = require('../database');

const getLiveWeatherData = async (dataParam) => {
  try {
    const db = getDatabase();
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);

   
    if (dataParam) {
      const requestedData = dataParam.split(',').map(d => d.trim());
      const invalidParams = requestedData.filter(param => !collectionNames.includes(param));
      
      if (invalidParams.length > 0) {
        const error = new Error('Paramètre invalide');
        error.invalidParams = invalidParams;
        error.status = 400;
        throw error;
      }
    }

    console.log('Collections disponibles:', collectionNames);

    if (!dataParam) {
      let latestDate = new Date();
      let latestLocation = { lat: 0, long: 0 };
      
      if (collectionNames.includes('nmea')) {
        const nmeaCollection = db.collection('nmea');
        const latestNmea = await nmeaCollection.findOne({}, { sort: { timestamp: -1 } });
        if (latestNmea) {
          latestDate = new Date(latestNmea.timestamp);
          latestLocation.lat = latestNmea.latitude;
          latestLocation.long = latestNmea.longitude;
        }
      }

      const result = {
        data: {
          date: latestDate.toISOString(),
          location: latestLocation,
          measurements: {}
        }
      };

      for (const collectionName of collectionNames) {
        if (collectionName !== 'nmea') {
          const collection = db.collection(collectionName);
          // Chercher sans la contrainte de date pour le debug
          const latestDoc = await collection.findOne({}, { sort: { date: -1 } });
          console.log(`Collection ${collectionName}:`, latestDoc ? 'trouvé' : 'non trouvé');
          if (latestDoc) {
            console.log(`Date du document: ${latestDoc.date}, Date de référence: ${latestDate}`);
            // Vérifier si le document est avant la date de référence
            if (new Date(latestDoc.date) <= latestDate) {
              if (collectionName === 'wind') {
                // Cas spécial pour wind: retourner toutes les valeurs
                result.data.measurements[collectionName] = {
                  speed_avg: {
                    unit: latestDoc.unit_speed || '',
                    value: latestDoc.speed_avg || 0
                  },
                  speed_max: {
                    unit: latestDoc.unit_speed || '',
                    value: latestDoc.speed_max || 0
                  },
                  speed_min: {
                    unit: latestDoc.unit_speed || '',
                    value: latestDoc.speed_min || 0
                  },
                  heading: {
                    unit: latestDoc.unit_heading || '',
                    value: latestDoc.heading || 0
                  }
                };
              } else {
                // Cas normal pour les autres collections
                result.data.measurements[collectionName] = {
                  unit: latestDoc.unit || '',
                  value: latestDoc.value || 0
                };
              }
            } else {
              console.log(`Document ${collectionName} est après la date de référence`);
            }
          }
        }
      }

      console.log('Measurements finales:', result.data.measurements);

      return result;
    }

    const requestedData = dataParam.split(',').map(d => d.trim());

    let latestDate = new Date();
    let latestLocation = { lat: 0, long: 0 };
    let latestNmeaData = null;
    
    if (collectionNames.includes('nmea')) {
      const nmeaCollection = db.collection('nmea');
      const latestNmea = await nmeaCollection.findOne({}, { sort: { timestamp: -1 } });
      if (latestNmea) {
        latestDate = new Date(latestNmea.timestamp);
        latestLocation.lat = latestNmea.latitude;
        latestLocation.long = latestNmea.longitude;
        latestNmeaData = latestNmea;
      }
    }

    const result = {
      data: {
        date: latestDate.toISOString(),
        location: latestLocation,
        measurements: {}
      }
    };

    for (const dataType of requestedData) {
      if (!collectionNames.includes(dataType)) {
        const error = new Error(`Paramètre invalide: ${dataType}`);
        error.status = 400;
        error.invalidParams = [dataType];
        throw error;
      }

      if (collectionNames.includes(dataType)) {
        const collection = db.collection(dataType);
        const latestDoc = await collection.findOne(
          { date: { $lte: latestDate.toISOString() } }, 
          { sort: { date: -1 } }
        );
        if (latestDoc) {
          if (dataType === 'wind') {
            result.data.measurements[dataType] = {
              speed_avg: {
                unit: latestDoc.unit_speed || '',
                value: latestDoc.speed_avg || 0
              },
              speed_max: {
                unit: latestDoc.unit_speed || '',
                value: latestDoc.speed_max || 0
              },
              speed_min: {
                unit: latestDoc.unit_speed || '',
                value: latestDoc.speed_min || 0
              },
              heading: {
                unit: latestDoc.unit_heading || '',
                value: latestDoc.heading || 0
              }
            };
          } else {

            result.data.measurements[dataType] = {
              unit: latestDoc.unit || '',
              value: latestDoc.value || 0
            };
          }
        }
      }
    }

    return result;
  } catch (error) {
    console.error('Erreur lors de la récupération des données live:', error);
    throw error;
  }
};

const getArchivedWeatherData = async (start, end) => {
  try {
    const db = getDatabase();
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    
    console.log('Collections disponibles:', collectionNames);
    
    const startDate = new Date(start * 1000);
    const endDate = new Date(end * 1000);
    

    startDate.setHours(startDate.getHours() - 24);
    endDate.setHours(endDate.getHours() + 1);
    
    console.log('Période recherchée:', startDate.toISOString(), 'à', endDate.toISOString());
    
    const result = {
      legend: ['time', 'lat', 'long'],
      unit: ['ISO8601', '°', '°'],
      data: []
    };

    let gpsData = [];
    if (collectionNames.includes('nmea')) {
      const nmeaCollection = db.collection('nmea');
      // Convertir les dates en format ISO string pour comparer avec timestamp
      gpsData = await nmeaCollection.find({
        timestamp: { 
          $gte: startDate.toISOString(), 
          $lte: endDate.toISOString() 
        }
      }).sort({ timestamp: 1 }).toArray();
      console.log('Données GPS trouvées:', gpsData.length);
    }

    const allTimestamps = new Set();
    if (gpsData.length > 0) {
      gpsData.forEach(p => allTimestamps.add(p.timestamp));
    }

    const desiredOrder = ['temperature', 'humidity', 'pressure', 'luminosity', 'wind'];

    const measureCollections = collectionNames.filter(name => name !== 'nmea');
    console.log('Collections disponibles pour mesures:', measureCollections);

    const activeCollections = [];
    for (const collectionName of desiredOrder) {
      if (!measureCollections.includes(collectionName)) continue;

      const collection = db.collection(collectionName);
      const query = {};
      query.date = { 
        $gte: startDate.toISOString(), 
        $lte: new Date(endDate.getTime() + 60000).toISOString() 
      };

      const measureData = await collection.find(query, { limit: 1 }).toArray();

      if (measureData.length > 0) {
        activeCollections.push(collectionName);
        if (collectionName === 'wind') {
          // Cas spécial pour wind: ajouter toutes les sous-valeurs individuellement
          result.legend.push('wind_speed_avg', 'wind_speed_max', 'wind_speed_min', 'wind_heading');
          const sample = await db.collection('wind').findOne();
          result.unit.push(
            sample?.unit_speed || 'Kts',
            sample?.unit_speed || 'Kts', 
            sample?.unit_speed || 'Kts',
            sample?.unit_heading || '°'
          );
        } else {
          result.legend.push(collectionName);
          const sample = await db.collection(collectionName).findOne();
          result.unit.push(sample?.unit || '');
        }

        // Ajouter les timestamps de cette collection à la chronologie
        const allDocs = await db.collection(collectionName).find(query).toArray();
        allDocs.forEach(d => allTimestamps.add(d.date));
      }
    }

    const sortedTimestamps = Array.from(allTimestamps).sort();
    console.log('Total timestamps uniques:', sortedTimestamps.length);

    // Pré-charger toutes les données NMEA pour éviter les requêtes dans la boucle
    const allNmeaData = [];
    if (collectionNames.includes('nmea')) {
      const nmeaCollection = db.collection('nmea');
      const nmeaQuery = {
        timestamp: { 
          $gte: startDate.toISOString(), 
          $lte: new Date(endDate.getTime() + 60000).toISOString() 
        }
      };
      allNmeaData.push(...await nmeaCollection.find(nmeaQuery).sort({ timestamp: 1 }).toArray());
    }

    for (const timestamp of sortedTimestamps) {
      let lat = null;
      let long = null;
      
      // Chercher les coordonnées GPS pour ce timestamp
      const matchingNmea = allNmeaData.find(nmea => nmea.timestamp <= timestamp);
      if (matchingNmea) {
        lat = matchingNmea.latitude;
        long = matchingNmea.longitude;
      }

      const rowData = [timestamp, lat, long];

      for (const collectionName of activeCollections) {
        const collection = db.collection(collectionName);
        const closestMeasure = await collection.findOne({
          date: { $lte: timestamp }
        }, { sort: { date: -1 } });

        if (closestMeasure) {
          if (collectionName === 'wind') {
            // Pour wind, ajouter les valeurs individuellement
            rowData.push(
              closestMeasure.speed_avg || 0,
              closestMeasure.speed_max || 0,
              closestMeasure.speed_min || 0,
              closestMeasure.heading || 0
            );
          } else {
            rowData.push(closestMeasure.value || 0);
          }
        } else {
          if (collectionName === 'wind') {
            // Pour wind, ajouter les valeurs null individuellement
            rowData.push(null, null, null, null);
          } else {
            rowData.push(null);
          }
        }
      }
      result.data.push(rowData);
    }

    console.log('Données finales:', result.data.length, 'lignes');
    return result;
  } catch (error) {
    console.error('Erreur lors de la récupération des données archivées:', error);
    throw error;
  }
};

module.exports = {
  getLiveWeatherData,
  getArchivedWeatherData
};
