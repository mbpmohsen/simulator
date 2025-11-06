// import React, { useState, useEffect, useCallback } from 'react';

// const UserList = () => { // typescript interfaces for type safety
//   const [users, setUsers] = useState([]);
//   const [loading, setLoading] = useState(false);

//   useEffect(() => {
//     setLoading(true);
//     fetch('https://jsonplaceholder.typicode.com/users')
//       .then((response) => response.json())
//       .then((data) => {
//         setUsers(data);
//         setLoading(false); // put it into the 
//       });//catch, exception error
//   }, []);

//   const handleUserClick = useCallback((userId) => {
//     console.log(`User clicked: ${userId}`);
//   }, []);

//   // consitional rendering.
//   return (
//     <div>
//       <h1>User List</h1>
//       {loading ? (
//         <p>Loading...</p>
//       ) : (
//         <ul>
//           {users.map((user) => (
//             <li key={user.id} onClick={() => handleUserClick(user.id)}>
//               {user.name}
//             </li>
//           ))}
//         </ul>
//       )}
//     </div>
//   );
// };

// export default UserList;

// import { useState, useEffect } from 'react';

// const useWindowSize = () => {
//   const [size, setSize] = useState({ width: 0, height: 0 });

//   useEffect(() => {
//     const handleResize = () => {
//       setSize({ width: window.innerWidth, height: window.innerHeight });
//     };

//     window.addEventListener('resize', handleResize);
//     handleResize(); // Initial call

//     return () => window.removeEventListener('resize', handleResize);
//   }, []);

//   return size;
// };

// export default useWindowSize;

// const Search = () => {
//     const [result, setResult] = useState([]);

//     const handleSeatch = (value) => {
//         const signal = Signal().abort();
//         fetch(`https://google.com?search=${value}`).then((response) => {
//             return response.json();
//         }).then((values) => {
//             setResult(values)
//         })
//     }

//     return <input name="searchInput" onChange={(e) => handleSeatch(e.target.value)} />
// }
