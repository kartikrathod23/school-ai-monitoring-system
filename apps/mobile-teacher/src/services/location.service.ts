import * as Location from "expo-location";

const calculateDistanceInMeters = (lat1: number,lon1: number,lat2: number,lon2: number) => {
  const R = 6371000;
  const dLat =((lat2 - lat1) * Math.PI) / 180;
  const dLon =((lon2 - lon1) * Math.PI) / 180;

  const a =Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *Math.sin(dLon / 2) *Math.sin(dLon / 2);

  const c = 2*Math.atan2(Math.sqrt(a),Math.sqrt(1 - a));

  return R * c;
};

export const startLocationTracking = async (
  schoolLatitude: number,
  schoolLongitude: number,
  geoRadius: number,
  onUpdate: (data: {
    isInside: boolean;
    distance: number;
    currentLatitude: number;
    currentLongitude: number;
  }) => void
) => {
  const permission = await Location.requestForegroundPermissionsAsync();

  if (permission.status !== "granted") {
    throw new Error("Location permission denied");
  }

  return await Location.watchPositionAsync({
      accuracy: Location.Accuracy.High,
      timeInterval: 60000,
      distanceInterval: 30,
    },

    (location) => {
      const currentLatitude =location.coords.latitude;
      const currentLongitude =location.coords.longitude;
      const distance =calculateDistanceInMeters(currentLatitude,currentLongitude,schoolLatitude,schoolLongitude);
      const isInside =distance <= geoRadius;

      onUpdate({
        isInside,
        distance,
        currentLatitude,
        currentLongitude,
      });
    }
  );
};