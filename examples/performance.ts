import apico from "../src";

async function basicExample() {
  // Make a simple GET request
  const response = await apico.get(
    "https://jsonplaceholder.typicode.com/users"
  );

  console.log(response.performance);
}

basicExample();