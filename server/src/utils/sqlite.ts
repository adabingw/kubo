import axios from "axios";
import { ALL_STOPS_ENDPOINT, GOAPI_KEY, GOAPI_URL } from '../env/env.go';
import { AppContext } from "../context";

// create local stops db to store go stops
const tableName = 'stops'

const init_db = async (context: AppContext) => {
    const db = context.sqldb;
    db.serialize(() => {
        // Create a users table with id, name, and email
        // db.run(`DROP TABLE IF EXISTS ${tableName}`, (err) => {
        //     if (err) {
        //       console.error(`Error dropping table ${tableName}:`, err.message);
        //     } else {
        //       console.log(`Table ${tableName} has been dropped.`);
        //     }
        // });
        db.run(`CREATE TABLE IF NOT EXISTS ${tableName} (
            stopCode TEXT PRIMARY KEY,
            stopName TEXT,
            type TEXT
        )`);
      
        // Create a secondary index on the 'email' column to improve query performance
        db.run(`CREATE INDEX IF NOT EXISTS idx_name ON stops (stopName)`);
    });

    const url = `${GOAPI_URL}${ALL_STOPS_ENDPOINT}?key=${GOAPI_KEY}`
    const response = await axios.get(url);
    const data = response.data;

    if (!(data && data.Metadata && data.Metadata.ErrorCode == "200")) {
        teardown(context);
        throw new Error("Cannot query all stops");
    }

    if (data.Stations && data.Stations.Station) {
        const stations = data.Stations.Station;
        for (const station of stations) {
            const query = 'INSERT OR IGNORE INTO stops (stopCode, stopName, type) VALUES (?, ?, ?)';
            db.run(query, [station.LocationCode.toString(), station.LocationName, station.LocationType], function(err) {
              if (err) {
                teardown(context);
                throw new Error(err + " " + station.LocationCode);
              }
            });
        }
    } else {
        teardown(context);
        throw new Error("Cannot query all stops");
    }
    return db;
}

const get_stop_by_stopcode = (context: AppContext, stopCode: string): Promise<{ stopCode: string; stopName: string, type: string }> => {
    const db = context.sqldb;
    return new Promise((resolve, reject) => {
        db.get(
            `SELECT * FROM stops
             WHERE stopCode = ? 
             `,
            [`${stopCode}`],  // First matches starting with, second ensures whole-word match
            (err, rows) => {
                if (err) {
                    console.error(err);
                    reject(err);
                } else {
                    resolve(rows as { stopCode: string; stopName: string; type: string });
                }
            }
        );
    });
}

const get_stop_by_name = (context: AppContext, stopName: string) => {
    const db = context.sqldb;
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

const teardown = (context: AppContext) => {
    const db = context.sqldb;
    db.close();
}

export {
    init_db, get_stop_by_name, get_stop_by_stopcode
}
