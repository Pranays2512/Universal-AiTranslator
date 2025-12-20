const multer = () => {
  return {
    single: (fieldName) => (req, res, next) => next()
  };
};

module.exports = multer();
