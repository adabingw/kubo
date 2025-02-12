const sqlite3 = require('sqlite3').verbose(); // Import SQLite
const axios = require('axios');
const go = require('env.go.js');

// create local stops db to store go stops
const db = new sqlite3.Database('./db');

const init_db = async () => {
    db.serialize(() => {
        // Create a users table with id, name, and email
        db.run(`CREATE TABLE IF NOT EXISTS stops (
            stopCode string PRIMARY KEY,
            stopName string,
            type string
        )`);
      
        // Create a secondary index on the 'email' column to improve query performance
        db.run(`CREATE INDEX IF NOT EXISTS idx_name ON stops (stopName)`);
    });

    const response = await axios.get(`${go.GOAPI_URL}${go.GOAPI_URL}?key=${go.GOAPI_KEY}`);
    const data = await response.json();

    if (!(data && data.Metadata && data.Metadata.ErrorCode == "200")) {
        teardown();
        throw new Error("Cannot query all stops");
    }

    if (data.Stations && data.Stations.Station) {
        const stations = data.Stations.Station;
        for (const station in stations) {
            const query = 'INSERT INTO stops (stopCode, stopName, type) VALUES (?, ?, ?)';

            db.run(query, [station.LocationCode, station.LocationName, station.LocationType], function(err) {
              if (err) {
                teardown();
                throw new Error(err);
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
    db.get("SELECT * FROM stops WHERE stopName = ?", [stopName], (err, row) => {
        if (err) {
            console.error(err);
        } else {
            console.log(row);
            return row;
        }
    });
}

const teardown = (db) => {
    db.close();
}

export { init_db, get_stop_by_name, teardown };
