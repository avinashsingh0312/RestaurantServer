const mongoose = require("mongoose");

const userSchema = mongoose.Schema({
    name:{
        type: String,
        required: [true, "Please add name"],
    },
    username:{
        type: String,
        required: true,
        unique: true,
    },
    password:{
        type: String,
        required: true,
    },
    restaurant: {
        type: String,
        enum: ['restaurant1', 'restaurant2', 'restaurant3', 'restaurant4', 'restaurant5'],
        required: true,
        validate: {
            validator: function (value) {
                return value !== ""; // Validate that the restaurant value is not an empty string
            },
            message: "Please select a restaurant",
        },
    },
},{
    timestamps: true,
})
module.exports=mongoose.model("User",userSchema);