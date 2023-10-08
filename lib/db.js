var PouchDB = require('/usr/lib/node_modules/pouchdb');

class Database {
  constructor(dbName) {
    this.db = new PouchDB(dbName);
  }

  // Create
  // async create(id, data) {
  //   try {
  //     const response = await this.db.put({ _id: id, ...data });
  //     return response;
  //   } catch (err) {
  //     console.log(err);
  //     throw err;
  //   }
  // }
  async create(id, data) {
    try {
        // Check if the document already exists
        try {
            const existingDoc = await this.db.get(id);
            if (existingDoc) {
                console.log("Document with id " + id + " already exists. Skipping creation.");
                return existingDoc;
            }
        } catch (err) {
            if (err.name !== 'not_found') {
                throw err;
            }
            // Document does not exist, proceed with creation
        }

        const response = await this.db.put({ _id: id, ...data });
        return response;
    } catch (err) {
        console.log(err);
        throw err;
    }
  }

  // Read
  async read(id) {
    try {
      const doc = await this.db.get(id);
      return doc;
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  // Update
  async update(id, data) {
    try {
      const doc = await this.db.get(id);
      const response = await this.db.put({ _id: id, _rev: doc._rev, ...data });
      return response;
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  // Delete
  async delete(id) {
    try {
      const doc = await this.db.get(id);
      const result = await this.db.remove(doc);
      return result;
    } catch (err) {
      console.log(err);
      throw err;
    }
  }
}

module.exports = Database;
