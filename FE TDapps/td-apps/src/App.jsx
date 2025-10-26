import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import ListTD from './pages/ListTD';
import CreateEdit from './pages/CreateEdit';

function App() {
  return (
    <>
      <Router>
        <Routes>
          <Route path="/" exact element={<Login />} />
          <Route path="/listtd" element={<ListTD />} />
          <Route path="/createedit" element={<CreateEdit />} />
        </Routes>
      </Router>
    </>
  );
}

export default App;
