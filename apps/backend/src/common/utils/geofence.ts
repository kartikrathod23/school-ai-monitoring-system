export const calculateDistanceInMeters = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) => {
  const R = 6371000;
  const dLat =((lat2 - lat1) * Math.PI) / 180;

  const dLon =((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) *
      Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c =2 *Math.atan2(Math.sqrt(a),Math.sqrt(1 - a));

  return R * c;
};


export const validateGeofence = (
  latitude: number,
  longitude: number,
  school: {
    latitude: number;
    longitude: number;
    geoRadius: number;
  }
) => {
  const distance =calculateDistanceInMeters(latitude,longitude,school.latitude,school.longitude);
  const isInside =distance <= school.geoRadius;
  return {distance,isInside,};
};