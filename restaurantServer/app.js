var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var dotenv = require('dotenv').config();
var passport = require('passport');
var connectDb = require('./config/dbConnection');

const { initializingPassport, isAuthenticated } = require('./config/passportConfig');
const expressSession= require('express-session');
const Material = require('./models/materialModel');
var User = require('./models/userModel');
var Restaurant = require('./models/restaurantModel');

connectDb();

initializingPassport(passport);

//var indexRouter = require('./routes/index');
//var usersRouter = require('./routes/users');

var app = express();
var PORT=5000;



// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(expressSession({
  secret: "secret",
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());


//app.use('/', indexRouter);
//app.use('/users', usersRouter);

//Routes
app.get('/',(req,res)=>{
  res.render('index');
});
app.get('/register',(req,res)=>{
  res.render('register');
});
app.get('/login',(req,res)=>{
  res.render('login');
});
app.post('/register',async(req,res)=>{
  const user= await User.findOne({uername: req.body.username});
  if(user) return res.status(400).send("User already exists");
  const newUser = await User.create(req.body);
  res.status(201).render('login');
});
app.post('/login',passport.authenticate("local",{failureRedirect:'/register',successRedirect:'/dashboard'}),async(req,res)=>{

});
app.get('/logout', function(req, res){
  req.logout(function(err) {
    if(err) {
      return next(err);
    }
    res.redirect('/');
  });
});
app.get('/dashboard', isAuthenticated, async(req, res) => {
  const userRestaurant = req.user.restaurant;
  res.redirect(`/dashboard/${userRestaurant}`);
});
app.get('/dashboard/admin', isAuthenticated, async (req, res) => {
  try {
        const restaurants = await Restaurant.find({}, '_id name');
    const selectedRestaurantId = req.query.selectedRestaurant;
    const materials = selectedRestaurantId
      ? await Material.find({ 'restaurant': selectedRestaurantId }).populate('restaurant')
      : [];
    const sourceMaterials = await Material.find({ 'restaurant': selectedRestaurantId }).populate('restaurant');
    res.render('adminDashboard', { restaurants, materials, selectedRestaurantId, sourceMaterials });
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).send('Internal Server Error');
  }
});
app.post('/dashboard/admin/view-materials', async (req, res) => {
  try {
      const selectedRestaurantId = req.body.selectedRestaurant;
      const restaurants = await Restaurant.find({}, '_id name');
      const materials = await Material.find({ 'restaurant': selectedRestaurantId }).populate('restaurant');
      const sourceMaterials = await Material.find({ 'restaurant': selectedRestaurantId }).populate('restaurant');
      res.render('adminDashboard', { materials, restaurants, selectedRestaurantId, sourceMaterials });
  } catch (error) {
      console.error('Error fetching materials:', error);
      res.status(500).send('Internal Server Error');
  }
});
app.post('/dashboard/admin/transfer-materials', async (req, res) => {
  try {
        const { sourceRestaurant, destinationRestaurant, materialForTransfer, transferQuantity } = req.body;
    const parsedQuantity = parseInt(transferQuantity);
    if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
      return res.status(400).send('Invalid transfer quantity');
    }
    const sourceMaterial = await Material.findById(materialForTransfer);
    if (!sourceMaterial) {
      return res.status(404).send('Material not found for transfer');
    }
    if (sourceMaterial.quantity < parsedQuantity) {
      return res.status(400).send('Insufficient quantity for transfer');
    }
    sourceMaterial.quantity -= parsedQuantity;
    await sourceMaterial.save();
    const destinationMaterial = await Material.findOne({
      restaurant: destinationRestaurant,
      materialName: sourceMaterial.materialName,
    });
    if (destinationMaterial) {
      destinationMaterial.quantity += parsedQuantity;
      await destinationMaterial.save();
    } else {
      const newDestinationMaterial = new Material({
        restaurant: destinationRestaurant,
        materialName: sourceMaterial.materialName,
        quantity: parsedQuantity,
      });
      await newDestinationMaterial.save();
    }
    res.redirect('/dashboard/admin');
  } catch (error) {
    console.error('Error transferring materials:', error);
    res.status(500).send('Internal Server Error');
  }
});
/////////////////////Restaurant1//////////////////////////////////////
app.get('/dashboard/restaurant1', isAuthenticated, async (req, res) => {
  try {
      const materials = await Material.find({ 'restaurant': '6581fa8b9b710e74b737c8d0' }).populate('restaurant');
      res.render('dashboard1', { materials });
  } catch (error) {
      console.error('Error fetching materials:', error);
      res.status(500).send('Internal Server Error');
  }
});
app.get('/dashboard/restaurant1/insert-material', (req, res) => {
    res.render('insertMaterial');
});
app.post('/dashboard/restaurant1/insert-material', async (req, res) => {
    try {
        const { materialName, quantity } = req.body;
        const newMaterial = new Material({
            restaurant: '6581fa8b9b710e74b737c8d0',
            materialName,
            quantity,
        });

        await newMaterial.save();
        res.redirect('/dashboard/restaurant1');
    } catch (error) {
        console.error('Error inserting material:', error);
        res.status(500).send('Internal Server Error');
    }
});
app.get('/dashboard/restaurant1/update-material/:id', async (req, res) => {
    try {
        const material = await Material.findById(req.params.id);
        res.render('updateMaterial', { material });
    } catch (error) {
        console.error('Error fetching material for update:', error);
        res.status(500).send('Internal Server Error');
    }
});
app.post('/dashboard/restaurant1/update-material', async (req, res) => {
  try {
      const materialId = req.body.materialIdToUpdate;
      if (!materialId.match(/^[0-9a-fA-F]{24}$/)) {
          console.error('Invalid Material ID:', materialId);
          return res.status(400).send('Invalid Material ID');
      }
      const material = await Material.findById(materialId);
      if (!material) {
          console.error('Material not found for ID:', materialId);
          return res.status(404).send('Material not found');
      }
      const { newQuantity } = req.body;
      material.quantity = newQuantity;
      await material.save();
      res.redirect('/dashboard/restaurant1');
  } catch (error) {
      console.error('Error updating material:', error);
      res.status(500).send('Internal Server Error');
  }
});
/////////////////////////////////Restaurant2/////////////////////////
app.get('/dashboard/restaurant2', isAuthenticated, async (req, res) => {
  try {
    const materials = await Material.find({ 'restaurant': '6581faa79b710e74b737c8d1' }).populate('restaurant');
    res.render('dashboard2', { materials });
  } catch (error) {
    console.error('Error fetching materials:', error);
    res.status(500).send('Internal Server Error');
  }
});
app.get('/dashboard/restaurant2/insert-material', (req, res) => {
    res.render('insertMaterial');
});
app.post('/dashboard/restaurant2/insert-material', async (req, res) => {
  try {
      const { materialName, quantity } = req.body;
      const existingMaterial = await Material.findOne({
          restaurant: '6581faa79b710e74b737c8d1',
          materialName,
      });

      if (existingMaterial) {
          console.error('Material with the same name already exists.');
          return res.status(400).send('Material with the same name already exists.');
      }
      const newMaterial = new Material({
          restaurant: '6581faa79b710e74b737c8d1',
          materialName,
          quantity,
      });

      await newMaterial.save();
      res.redirect('/dashboard/restaurant2');
  } catch (error) {
      console.error('Error inserting material:', error);
      res.status(500).send('Internal Server Error');
  }
});
app.get('/dashboard/restaurant2/update-material/:id', async (req, res) => {
    try {
        const material = await Material.findById(req.params.id);
        res.render('updateMaterial', { material });
    } catch (error) {
        console.error('Error fetching material for update:', error);
        res.status(500).send('Internal Server Error');
    }
});
app.post('/dashboard/restaurant2/update-material', async (req, res) => {
  try {
      const materialId = req.body.materialIdToUpdate;
      if (!materialId.match(/^[0-9a-fA-F]{24}$/)) {
          console.error('Invalid Material ID:', materialId);
          return res.status(400).send('Invalid Material ID');
      }
      const material = await Material.findById(materialId);
      if (!material) {
          console.error('Material not found for ID:', materialId);
          return res.status(404).send('Material not found');
      }
      const { newQuantity } = req.body;
      material.quantity = newQuantity;
      await material.save();
      res.redirect('/dashboard/restaurant2');
  } catch (error) {
      console.error('Error updating material:', error);
      res.status(500).send('Internal Server Error');
  }
});

/////////////////////Restaurant3//////////////////////////////////////
app.get('/dashboard/restaurant3', isAuthenticated, async (req, res) => {
  try {
      const materials = await Material.find({ 'restaurant': '6581fab59b710e74b737c8d2' }).populate('restaurant');
      res.render('dashboard3', { materials });
  } catch (error) {
      console.error('Error fetching materials:', error);
      res.status(500).send('Internal Server Error');
  }
});
app.get('/dashboard/restaurant3/insert-material', (req, res) => {
    res.render('insertMaterial');
});
app.post('/dashboard/restaurant3/insert-material', async (req, res) => {
    try {
        const { materialName, quantity } = req.body;
        const newMaterial = new Material({
            restaurant: '6581fab59b710e74b737c8d2', 
            materialName,
            quantity,
        });

        await newMaterial.save();
        res.redirect('/dashboard/restaurant3');
    } catch (error) {
        console.error('Error inserting material:', error);
        res.status(500).send('Internal Server Error');
    }
});
app.get('/dashboard/restaurant3/update-material/:id', async (req, res) => {
    try {
        const material = await Material.findById(req.params.id);
        res.render('updateMaterial', { material });
    } catch (error) {
        console.error('Error fetching material for update:', error);
        res.status(500).send('Internal Server Error');
    }
});
app.post('/dashboard/restaurant3/update-material', async (req, res) => {
  try {
      const materialId = req.body.materialIdToUpdate;
      if (!materialId.match(/^[0-9a-fA-F]{24}$/)) {
          console.error('Invalid Material ID:', materialId);
          return res.status(400).send('Invalid Material ID');
      }
      const material = await Material.findById(materialId);
      if (!material) {
          console.error('Material not found for ID:', materialId);
          return res.status(404).send('Material not found');
      }
      const { newQuantity } = req.body;
      material.quantity = newQuantity;
      await material.save();
      res.redirect('/dashboard/restaurant3');
  } catch (error) {
      console.error('Error updating material:', error);
      res.status(500).send('Internal Server Error');
  }
});

/////////////////////Restaurant4//////////////////////////////////////
app.get('/dashboard/restaurant4', isAuthenticated, async (req, res) => {
  try {
      const materials = await Material.find({ 'restaurant': '6581fac79b710e74b737c8d3' }).populate('restaurant');
      res.render('dashboard4', { materials });
  } catch (error) {
      console.error('Error fetching materials:', error);
      res.status(500).send('Internal Server Error');
  }
});
app.get('/dashboard/restaurant4/insert-material', (req, res) => {
    res.render('insertMaterial');
});
app.post('/dashboard/restaurant4/insert-material', async (req, res) => {
    try {
        const { materialName, quantity } = req.body;
        const newMaterial = new Material({
            restaurant: '6581fac79b710e74b737c8d3',
            materialName,
            quantity,
        });

        await newMaterial.save();
        res.redirect('/dashboard/restaurant4');
    } catch (error) {
        console.error('Error inserting material:', error);
        res.status(500).send('Internal Server Error');
    }
});
app.get('/dashboard/restaurant4/update-material/:id', async (req, res) => {
    try {
        const material = await Material.findById(req.params.id);
        res.render('updateMaterial', { material });
    } catch (error) {
        console.error('Error fetching material for update:', error);
        res.status(500).send('Internal Server Error');
    }
});
app.post('/dashboard/restaurant4/update-material', async (req, res) => {
  try {
      const materialId = req.body.materialIdToUpdate;

      if (!materialId.match(/^[0-9a-fA-F]{24}$/)) {
          console.error('Invalid Material ID:', materialId);
          return res.status(400).send('Invalid Material ID');
      }
      const material = await Material.findById(materialId);
      if (!material) {
          console.error('Material not found for ID:', materialId);
          return res.status(404).send('Material not found');
      }

      const { newQuantity } = req.body;
      material.quantity = newQuantity;
      await material.save();
      res.redirect('/dashboard/restaurant4');
  } catch (error) {
      console.error('Error updating material:', error);
      res.status(500).send('Internal Server Error');
  }
});

/////////////////////Restaurant5//////////////////////////////////////
app.get('/dashboard/restaurant5', isAuthenticated, async (req, res) => {
  try {
      const materials = await Material.find({ 'restaurant': '6581fad89b710e74b737c8d4' }).populate('restaurant');
      res.render('dashboard5', { materials });
  } catch (error) {
      console.error('Error fetching materials:', error);
      res.status(500).send('Internal Server Error');
  }
});
app.get('/dashboard/restaurant5/insert-material', (req, res) => {
    res.render('insertMaterial');
});
app.post('/dashboard/restaurant5/insert-material', async (req, res) => {
    try {
        const { materialName, quantity } = req.body;
        const newMaterial = new Material({
            restaurant: '6581fad89b710e74b737c8d4', 
            materialName,
            quantity,
        });

        await newMaterial.save();
        res.redirect('/dashboard/restaurant5');
    } catch (error) {
        console.error('Error inserting material:', error);
        res.status(500).send('Internal Server Error');
    }
});
app.get('/dashboard/restaurant5/update-material/:id', async (req, res) => {
    try {
        const material = await Material.findById(req.params.id);
        res.render('updateMaterial', { material });
    } catch (error) {
        console.error('Error fetching material for update:', error);
        res.status(500).send('Internal Server Error');
    }
});
app.post('/dashboard/restaurant5/update-material', async (req, res) => {
  try {
      const materialId = req.body.materialIdToUpdate;
      if (!materialId.match(/^[0-9a-fA-F]{24}$/)) {
          console.error('Invalid Material ID:', materialId);
          return res.status(400).send('Invalid Material ID');
      }
      const material = await Material.findById(materialId);
      if (!material) {
          console.error('Material not found for ID:', materialId);
          return res.status(404).send('Material not found');
      }

      const { newQuantity } = req.body;
      material.quantity = newQuantity;
      await material.save();
      res.redirect('/dashboard/restaurant5');
  } catch (error) {
      console.error('Error updating material:', error);
      res.status(500).send('Internal Server Error');
  }
});

//Server 
app.listen(PORT,()=>{
  console.log(`Server is running on port ${PORT}`);
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
