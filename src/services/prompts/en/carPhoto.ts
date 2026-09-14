export const photoAnalysisPrompt = 
  'Identify the vehicle and its license plate in this image. ' +
  'Extract the license plate number (uppercase, no extra spaces), country, license plate color, license plate format, make, model, color, and body type.\n' +
  'For country, return one of: "UA", "PL", "D", "LT", "CZ", "RO", "MD", "GB", "US", "OTHER" (default to "UA" if in Ukraine or unclear).\n' +
  'For plateColor, return one of: "white" (standard civilian), "yellow" (public transport/taxi), "red" (transit/temporary), "green" (EV electric vehicle), "black_military" (military/special forces), "black_old" (old vintage format), "blue" (police/diplomatic).\n' +
  'For plateForm, return one of: "standard" (horizontal rectangular plate), "square_us" (square 2-line American/Japanese size), "square_moto" (square 2-line motorcycle size).\n' +
  'For color, return one of the following canonical identifiers matching the vehicle paint in lowercase: ' +
  '"білий" (white), "чорний" (black), "сірий" (grey), "сріблястий" (silver), "червоний" (red), "синій" (blue), "блакитний" (light blue), "зелений" (green), "жовтий" (yellow), "коричневий" (brown), "помаранчевий" (orange), "фіолетовий" (purple), "бежевий" (beige).\n' +
  'For body type, return one of the following canonical identifiers matching the vehicle body style in lowercase: ' +
  '"седан" (sedan), "хетчбек" (hatchback), "універсал" (wagon/estate), "позашляховик / кросовер" (SUV/crossover), "купе" (coupe), "мінівен" (minivan), "пікап" (pickup), "кабріолет" (cabriolet), "фургон" (van), "мопед" (moped), "мотоцикл" (motorcycle), "трицикл" (tricycle), "скутер" (scooter), "велосипед" (bicycle), "електроскутер" (e-scooter), "електровелосипед" (e-bike), "електротрицикл" (e-trike), "електромотоцикл" (e-motorcycle).\n' +
  'For make and model, use standard manufacturer Latin names (e.g. "Toyota", "Camry").\n' +
  'If a field is not recognized with confidence, return an empty string.';
