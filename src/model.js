(function (orb, $) {
    orb.Model = Backbone.Model.extend({
        initialize: function (options) {
            var self = this;
            options = options || {};

            // initialize information from the schema
            self.references = {};

            // create the reference information
            var schema = self.constructor.schema;
            if (schema) {
                _.forEach(schema.columns, function (column) {
                    if (column.type === 'Reference') {
                        self.references[column.name] = undefined;
                    }
                });

                _.forEach(schema.collectors, function (collector) {
                    if (collector.flags.Unique) {
                        self.references[collector.name] = undefined;
                    } else {
                        var model = schema.referenceScope[collector.model];
                        var records = new  model.collection();
                        records.urlRoot = function () {
                            var root = self.urlRoot;
                            var record_id = self.get('id');
                            if (!(root && record_id)) {
                                return undefined;
                            } else {
                                var trimmed = s.trim(self.urlRoot, '/');
                                return trimmed + '/' + record_id;
                            }
                        };
                        self[collector.name] = records;
                    }
                });
            }

            // call the base class's method
            Backbone.Model.prototype.initialize.call(this, options);
        },
        get: function (attribute) {
            var self = this;
            var schema = this.constructor.schema;
            if (schema) {
                var collector = schema.collectors[attribute];
                var column = undefined;
                _.forEach(schema.columns, function (col) {
                    if (col.type === 'Reference' && col.name === attribute) {
                        column = col;
                    }
                });

                // get a reference column
                if (column && column.type === 'Reference') {
                    var record = this.references[attribute];
                    if (record === undefined) {
                        record = new schema.referenceScope[column.reference]({id: self.attributes[column.field]});
                        this.references[column.name] = record;
                    }
                    return record;
                }

                // get a collection of objects
                else if (collector) {
                    if (collector.flags.Unique) {
                        var record = this.references[attribute];
                        if (record === undefined) {
                            record = new schema.referenceScope[collector.model]();
                            record.urlRoot = this.url() + '/' + name;
                            this.references[attribute] = record;
                        }
                        return record;
                    } else {
                        return this[attribute];
                    }
                }

                // get a regular attribute
                else {
                    return Backbone.Model.prototype.get.call(this, attribute);
                }
            }

            // get a regular attribute
            else {
                return Backbone.Model.prototype.get.call(this, attribute);
            }
        },
        parse: function (response, options) {
            var self = this;
            var schema = self.constructor.schema;

            if (schema) {
                // load references
                _.forEach(schema.columns, function (column) {
                    if (column.type === 'Reference') {
                        var data = response[column.name];
                        delete response[column.name];
                        if (data !== undefined) {
                            if (!self.references[column.name]) {
                                self.references[column.name] = new schema.referenceScope[column.reference](data);
                            } else {
                                self.references[column.name].update(data);
                            }
                        }
                    }
                });

                // load collectors
                _.forEach(schema.collectors, function (collector) {
                    var data = response[collector.name];
                    delete response[collector.name];
                    if (data) {
                        if (collector.flags.Unique) {
                            if (!self.references[collector.name]) {
                                self.references[collector.name] = new schema.referenceScope[collector.model](data);
                            } else {
                                self.references[collctor.name].update(data);
                            }
                        } else {
                            var records = undefined;
                            if (data instanceof Array) {
                                records = data;
                            } else {
                                records = data.records;
                            }

                            if (records !== undefined) {
                                self[collector.name].set(records);
                            }
                        }
                    }
                });
            }

            // process the base call
            return Backbone.Model.prototype.parse.call(this, response, options);
        },
        set: function (attributes, options) {
            var self = this;
            _.forEach(attributes, function (value, attribute) {
                // set reference information
                if (_.hasOwnProperty(self.references, attribute)) {
                    delete attributes[attribute];

                    if (value instanceof orb.Model) {
                        self.references[attribute] = value;
                    } else {
                        var ref = self.get(attribute);
                        ref.update(value);
                    }
                }

                // set collection information
                else if (_.hasOwnProperty(self, attribute)) {
                    delete attributes[attribute];
                    if (value instanceof orb.Collection) {
                        self[attribute] = value;
                    } else {
                        self[attribute].set(value);
                    }
                }
            });

            return Backbone.Model.prototype.set.call(this, attributes, options);
        },
        unset: function (attribute, options) {
            // unset a reference object
            if (this.references[name] !== undefined) {
                options = options || {};
                var data = this.references[name]
                delete data;
                if (!options.silent) {
                    this.trigger('change:' + name, data);
                }
            }

            // unset a collection
            else if (this[attribute] !== undefined) {
                this[attribute].reset();
            }

            // unset an attribute
            else {
                Backbone.Model.prototype.unset.call(this, attribute, options);
            }
        },
        url: function () {
            if (this.collection) {
                var id = this.get('id');
                if (id) {
                    return this.collection.url() + '/' + id;
                } else {
                    return this.collection.url();
                }
            } else {
                return Backbone.Model.prototype.url.call(this);
            }
        }
    }, {
        schema: undefined,
        collection: orb.Collection,
        all: function (options) {
            return this.select(options);
        },
        select: function (context) {
            var records = new this.collection();
            records.context = _.extend({}, records.context, context);
            records.urlRoot = this.prototype.urlRoot;
            records.model = this;
            return records;
        },
        byId: function (id, options) {
            options = options || {};
            var q = new orb.Q('id').is(id);
            options.where = q.and(options.where);
            return this.select().fetchOne(options);
        }
    });
})(window.orb);