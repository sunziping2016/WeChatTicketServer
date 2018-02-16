const fs = require('fs');
const path = require('path');
const logger = require('winston');

function addUpdatedAt(schema, field) {
  if (!field)
    field = 'updatedAt';
  schema.pre('save', function (next) {
    if (this.isModified())
      this[field] = new Date();
    next();
  });
  schema.pre('findOneAndUpdate', function () {
    const update = this.getUpdate();
    update[field] = new Date();
  });
  schema.pre('update', function () {
    const update = this.getUpdate();
    update[field] = new Date();
  });
}

function addCreatedAt(schema, field) {
  if (!field)
    field = 'createdAt';
  schema.pre('save', function (next) {
    if (this.isNew)
      this[field] = new Date();
    next();
  });
  schema.pre('findOneAndUpdate', function () {
    const update = this.getUpdate();
    update['$setOnInsert'] = update['$setOnInsert'] || {};
    update['$setOnInsert'][field] = new Date();
  });
  schema.pre('update', function () {
    const update = this.getUpdate();
    update[field] = new Date();
    update['$setOnInsert'] = update['$setOnInsert'] || {};
    update['$setOnInsert'][field] = new Date();
  });
}

function addDeleted(schema, field) {
  if (!field)
    field = 'deleted';
  schema.pre('save', function (next) {
    if (this.isNew && !this[field])
      this[field] = false;
    next();
  });
  schema.pre('findOneAndUpdate', function () {
    const update = this.getUpdate();
    update['$setOnInsert'] = update['$setOnInsert'] || {};
    if (!update['$setOnInsert'][field])
      update['$setOnInsert'][field] = false;
  });
  schema.pre('update', function () {
    const update = this.getUpdate();
    update['$setOnInsert'] = update['$setOnInsert'] || {};
    if (!update['$setOnInsert'][field])
      update['$setOnInsert'][field] = false;
  });
  schema.query.deleted = function (deleted) {
    return this.where(field).eq(true);
  };
  schema.query.notDeleted = function () {
    return this.where(field).ne(true);
  };
  schema.methods.delete = function () {
    this[field] = true;
    return this.save();
  };
}

function addFileFields(schema, fields, uploadDir) {
  if (fields.length === 0)
    return;
  if (uploadDir === undefined)
    uploadDir = '';
  function errLogger(filename) {
    return err => {
      if (err) {
        logger.error(`Failed to delete file "${filename}".`);
        logger.error(err);
      }
    };
  }
  schema.post('init', doc => {
    for (let field of fields)
      doc['_' + field] = doc[field];
  });
  schema.post('save', doc => {
    for (let field of fields) {
      const oldFilename = doc['_' + field];
      if (oldFilename && oldFilename !== doc[field])
        fs.unlink(path.join(uploadDir, oldFilename), errLogger(oldFilename));
    }
  });

  schema.post('remove', doc => {
    for (let field of fields) {
      const oldFilename = doc['_' + field];
      if (oldFilename)
        fs.unlink(path.join(uploadDir, oldFilename), errLogger(oldFilename));
    }
  });
}

module.exports = {
  addCreatedAt,
  addUpdatedAt,
  addDeleted,
  addFileFields
};
