const { getDatabase } = require('../database');

const getLiveWeatherData = async (dataParam) => {
  try {
    const db = getDatabase();
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);

    // Validation des paramètres
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
      // Récupérer les données GPS les plus récentes d'abord
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

      // Récupérer les mesures les plus récentes de chaque collection AVANT la date du GPS
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
    
    // Récupérer les données GPS les plus récentes d'abord
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

    for (const dataType of requestedData) {
      if (collectionNames.includes(dataType)) {
        const collection = db.collection(dataType);
        const latestDoc = await collection.findOne(
          { date: { $lte: latestDate.toISOString() } }, 
          { sort: { date: -1 } }
        );
        if (latestDoc) {
          if (dataType === 'wind') {
            // Cas spécial pour wind: retourner toutes les valeurs
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
            // Cas normal pour les autres collections
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
    
    // Élargir la période pour être sûr d'inclure les données récentes
    startDate.setHours(startDate.getHours() - 24); // -24 heures
    endDate.setHours(endDate.getHours() + 1); // +1 heure
    
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

    const measureCollections = collectionNames.filter(name => name !== 'nmea');
    console.log('Collections de mesures:', measureCollections);

    for (const collectionName of measureCollections) {
      const collection = db.collection(collectionName);
      // Élargir la période pour être sûr d'inclure les données récentes
      const measureData = await collection.find({
        date: { 
          $gte: startDate.toISOString(), 
          $lte: new Date(endDate.getTime() + 60000).toISOString() 
        } // +1 minute
      }).sort({ date: 1 }).toArray();
      
      console.log(`Collection ${collectionName}: ${measureData.length} documents trouvés`);

      if (measureData.length > 0) {
        measureData.forEach(m => allTimestamps.add(m.date));
        if (collectionName === 'wind') {
          // Cas spécial pour wind: ajouter toutes les sous-valeurs
          result.legend.push('wind_speed_avg', 'wind_speed_max', 'wind_speed_min', 'wind_heading');
          result.unit.push(
            measureData[0].unit_speed || 'Kts',
            measureData[0].unit_speed || 'Kts', 
            measureData[0].unit_speed || 'Kts',
            measureData[0].unit_heading || '°'
          );
        } else {
          result.legend.push(collectionName);
          const unit = measureData[0].unit || '';
          result.unit.push(unit);
        }
      }
    }

    const sortedTimestamps = Array.from(allTimestamps).sort();
    console.log('Total timestamps uniques:', sortedTimestamps.length);

    for (const timestamp of sortedTimestamps) {
      // Trouver la position GPS correspondante (la plus proche avant ou à cette date)
      let lat = null;
      let long = null;
      
      if (collectionNames.includes('nmea')) {
        const nmeaCollection = db.collection('nmea');
        const closestNmea = await nmeaCollection.findOne({
          timestamp: { $lte: timestamp }
        }, { sort: { timestamp: -1 } });
        
        if (closestNmea) {
          lat = closestNmea.latitude;
          long = closestNmea.longitude;
        }
      }

      const rowData = [
        timestamp,
        lat,
        long
      ];

      for (const collectionName of measureCollections) {
        if (!result.legend.includes(collectionName) && collectionName !== 'wind') continue;
        if (collectionName === 'wind' && !result.legend.includes('wind_speed_avg')) continue;

        const collection = db.collection(collectionName);
        const closestMeasure = await collection.findOne({
          date: { $lte: timestamp }
        }, { sort: { date: -1 } });

        if (closestMeasure) {
          if (collectionName === 'wind') {
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
