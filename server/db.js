const sqlite3 = require('sqlite3').verbose(); // Import SQLite
const axios = require('axios');
const go = require('./env.go.js');

// create local stops db to store go stops
const db = new sqlite3.Database('./db');
const tableName = 'stops'

const init_db = async () => {
    db.serialize(() => {
        // Create a users table with id, name, and email
        db.run(`DROP TABLE IF EXISTS ${tableName}`, (err) => {
            if (err) {
              console.error(`Error dropping table ${tableName}:`, err.message);
            } else {
              console.log(`Table ${tableName} has been dropped.`);
            }
        });
        db.run(`CREATE TABLE IF NOT EXISTS ${tableName} (
            stopCode string PRIMARY KEY,
            stopName string,
            type string
        )`);
      
        // Create a secondary index on the 'email' column to improve query performance
        db.run(`CREATE INDEX IF NOT EXISTS idx_name ON stops (stopName)`);
    });

    const url = `${go.GOAPI_URL}${go.ALL_STOPS_ENDPOINT}?key=${go.GOAPI_KEY}`
    const response = await axios.get(url);
    const data = response.data;

    if (!(data && data.Metadata && data.Metadata.ErrorCode == "200")) {
        teardown();
        throw new Error("Cannot query all stops");
    }

    if (data.Stations && data.Stations.Station) {
        const stations = data.Stations.Station;
        for (const station of stations) {
            const query = 'INSERT INTO stops (stopCode, stopName, type) VALUES (?, ?, ?)';
            db.run(query, [station.LocationCode, station.LocationName, station.LocationType], function(err) {
              if (err) {
                // teardown();
                throw new Error(err + " " + station.LocationCode);
              }
            });
        }
    } else {
        teardown();
        throw new Error("Cannot query all stops");
    }
    return db;
}

const get_stop_by_name = (stopName) => {
    return new Promise((resolve, reject) => {
        db.all(
            `SELECT * FROM stops
             WHERE stopName LIKE ? 
             OR stopName LIKE ? 
             OR stopName LIKE ?
             OR stopName = ?
             `,
            [`${stopName}%`, `% ${stopName} %`, `% ${stopName}`, `${stopName}`],  // First matches starting with, second ensures whole-word match
            (err, rows) => {
                if (err) {
                    console.error(err);
                    reject(err);
                } else {
                    resolve(rows);
                }
            }
        );
    });
}

const teardown = (db) => {
    db.close();
}

module.exports = {
    init_db, get_stop_by_name
}
