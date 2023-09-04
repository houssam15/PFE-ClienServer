import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import Routes from './routes/route.js'
const app = express();
app.use(bodyParser.json({ extended: true }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());
const PORT = 4001;


app.use("/",Routes);

app.listen(PORT, () => console.log(`Server is running successfully on PORT ${PORT}`));

export {};