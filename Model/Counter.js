const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CounterSchema = new Schema({
  scope: {
     type: String,
     required: true,
    }, 
  seq: {
     type: Number,
     default: 0 
    }},
 { timestamps: true });

CounterSchema.index({ scope: 1 }, { unique: true });

module.exports = mongoose.models.Counter || mongoose.model("Counter", CounterSchema);