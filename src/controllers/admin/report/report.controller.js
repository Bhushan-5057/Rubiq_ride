import {
  getSummaryReportService,
  getDriverReportService,
  getPassengerReportService,
  getRevenueReportService,
  getRideReportService,
  getDriverReportByIdService,
  getPassengerReportByIdService
} from "../../../services/adminServices/adminReportService/report.service.js";

//-------------------------- Summary Report --------------------------
export const getSummaryReport = async (req, res, next) => {
  try {
    const report = await getSummaryReportService();

    res.status(200).json({
      success: true,
      message: "Summary report fetched successfully",
      data: report,
    });
  } catch (error) {
    next(error);
  }
};

//------------------------- Get Driver Report by ID -------------------------
export const getDriverReportById = async (req, res, next) => {
  try {
    const driverId = req.params.id;
    const report = await getDriverReportByIdService(driverId);

    res.status(200).json({
      success: true,
      message: "Driver report fetched successfully",
      data: report,
    });
  } catch (error) {
    next(error);
  }
};

//-------------------------- Driver Report --------------------------
export const getDriverReport = async (req, res, next) => {
  try {
    const options = {
      page: parseInt(req.query.page, 10) || 1,
      limit: parseInt(req.query.limit, 10) || 10,
      fromDate: req.query.fromDate,
      toDate: req.query.toDate,
    };

    const report = await getDriverReportService(options);

    res.status(200).json({
      success: true,
      message: "Driver report fetched successfully",
      data: report,
    });
  } catch (error) {
    next(error);
  }
};

//-------------------------- Passenger Report --------------------------
export const getPassengerReportById = async (req, res, next) => {
  try {
    const passengerId = req.params.id;
    const report = await getPassengerReportByIdService(passengerId);

    res.status(200).json({
      success: true,
      message: "Passenger report fetched successfully",
      data: report,
    });
  } catch (error) {
    next(error);
  }
};

//-------------------------- Passenger Report --------------------------
export const getPassengerReport = async (req, res, next) => {
  try {
    const options = {
      page: parseInt(req.query.page, 10) || 1,
      limit: parseInt(req.query.limit, 10) || 10,
      fromDate: req.query.fromDate,
      toDate: req.query.toDate,
    };

    const report = await getPassengerReportService(options);

    res.status(200).json({
      success: true,
      message: "Passenger report fetched successfully",
      data: report,
    });
  } catch (error) {
    next(error);
  }
};

//-------------------------- Revenue Report --------------------------
export const getRevenueReport = async (req, res, next) => {
  try {
    const report = await getRevenueReportService();

    res.status(200).json({
      success: true,
      message: "Revenue report fetched successfully",
      data: report,
    });
  } catch (error) {
    next(error);
  }
};

//-------------------------- Ride Report --------------------------
export const getRideReport = async (req, res, next) => {
  try {
    const report = await getRideReportService();

    res.status(200).json({
      success: true,
      message: "Ride report fetched successfully",
      data: report,
    });
  } catch (error) {
    next(error);
  }
};