// test-destructure.ts (temporary)
async function test() {
  // Simulate Supabase response
  const response = {  { user: { id: '123' } }, error: null };
  
  // This should work:
  const {  { user } } = response;
  console.log(user?.id); // Should print: '123'
}