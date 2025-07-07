exports.handler = async (event, context) => {
  console.log("Background function test started");
  return {
    statusCode: 200,
    body: "Background function ran successfully!"
  };
}; 