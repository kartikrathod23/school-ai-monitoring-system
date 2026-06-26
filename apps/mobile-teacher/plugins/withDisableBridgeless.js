const { withGradleProperties } = require('expo/config-plugins');

module.exports = function withDisableBridgeless(config) {
  return withGradleProperties(config, (config) => {
    // Add bridgelessEnabled=false
    // Check if it already exists to avoid duplicates
    const props = ['newArchEnabled', 'bridgelessEnabled'];
    props.forEach(prop => {
      const index = config.modResults.findIndex((item) => item.type === 'property' && item.key === prop);
      if (index > -1) {
        config.modResults[index].value = 'false';
      } else {
        config.modResults.push({
          type: 'property',
          key: prop,
          value: 'false',
        });
      }
    });
    return config;
  });
};
