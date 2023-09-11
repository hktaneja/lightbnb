const properties = require("./json/properties.json");
const users = require("./json/users.json");

const { Pool } = require('pg');

const pool = new Pool({
  user: 'labber',
  password: '123',
  host: 'localhost',
  database: 'lightbnb'
});


/// Users

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithEmail = function (email) {
  return pool.query('SELECT * FROM users WHERE email = $1', [email])
    .then((result) => {
      return result.rows[0]; // Assuming you expect a single user or null
    })
    .catch((err) => {
      console.log(err.message);
      return null;
    });

};

/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithId = function (id) {
  return pool.query('SELECT * FROM users WHERE id = $1', [id])
    .then((result) => {
      return result.rows[0]; // Assuming you expect a single user or null
    })
    .catch((err) => {
      console.log(err.message);
      return null;
    });
};

/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */
const addUser = function (user) {
  return pool.query(
    'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING *',
    [user.name, user.email, user.password]
  )
    .then((result) => {
      return result.rows[0];
    })
    .catch((err) => {
      console.log(err.message);
      return null;
    });
};

/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
const getAllReservations = function (guest_id, limit = 10) {
  const query = `
    SELECT properties.*, reservations.*
    FROM reservations
    JOIN properties ON reservations.property_id = properties.id    
    WHERE reservations.guest_id = $1   
    ORDER BY reservations.start_date
    LIMIT $2;
  `;

  return pool
    .query(query, [guest_id, limit])
    .then((result) => {
      return result.rows;
    })
    .catch((err) => {
      console.log(err.message);
      return null;
    });
};

/// Properties

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */
const getAllProperties = function (options, limit = 10) {
  const queryParams = [];
  let queryString = `
    SELECT properties.*, AVG(property_reviews.rating) AS average_rating
    FROM properties
    LEFT JOIN property_reviews ON properties.id = property_id
  `;

  // Check if an owner_id is provided
  if (options.owner_id) {
    queryParams.push(options.owner_id);
    queryString += `WHERE properties.owner_id = $${queryParams.length} `;
  }

  if (options.city) {
    queryParams.push(`%${options.city}%`);
    queryString += `WHERE city LIKE $${queryParams.length} `;   
  }

  // Check if both minimum_price_per_night and maximum_price_per_night are provided
  if (options.minimum_price_per_night && options.maximum_price_per_night) {
    queryParams.push(options.minimum_price_per_night * 100); // Convert to cents
    queryParams.push(options.maximum_price_per_night * 100); // Convert to cents
    queryString += `AND properties.cost_per_night BETWEEN $${queryParams.length - 1} AND $${queryParams.length} `;
  }

  queryString += `
    GROUP BY properties.id
  `;

  if (options.minimum_rating) {
    queryParams.push(options.minimum_rating);
    queryString += `
      HAVING AVG(property_reviews.rating) >= $${queryParams.length}
    `;
  }
  queryParams.push(limit);
  queryString += `
    ORDER BY properties.cost_per_night    
    LIMIT $${queryParams.length};
  `;

  console.log(queryString, queryParams);

  return pool.query(queryString, queryParams).then((res) => res.rows);
};




  

/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = function (property) {
  const propertyId = Object.keys(properties).length + 1;
  property.id = propertyId;
  properties[propertyId] = property;
  return Promise.resolve(property);
};

module.exports = {
  getUserWithEmail,
  getUserWithId,
  addUser,
  getAllReservations,
  getAllProperties,
  addProperty,
};
