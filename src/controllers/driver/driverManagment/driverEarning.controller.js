import {getDriverEarnings} from "../../../services/driverServices/driverEarningService/driverEarning.service.js"

export async function getDriverEarningsController(req, res, next) {
    try {
        const driverId = req.params.driverId;
        const {startDate, endDate} = req.query;
        const earningsData = await getDriverEarnings(driverId, new Date(startDate), new Date(endDate));
        res.status(200).json(earningsData);
    } catch (error) {
        next(error);
    }
}