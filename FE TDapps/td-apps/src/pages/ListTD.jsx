import React from 'react';
import '../assets/css/listtd.css';
import { NavLink } from 'react-router-dom';
import Pen from '../assets/pen-solid-full.svg';
import Trash from '../assets/trash-solid-full.svg';

const ListTD = () => {
  return (
    <div>
      <div className="container-fluid">
        <h1 className="title">Notebook of Technical Director.</h1>
        <NavLink to={'/createedit'} className="btn btn-success">
          Create
        </NavLink>
        <table className="table table-striped">
          <thead>
            <tr>
              <th scope="col">Tanggal</th>
              <th scope="col">Nama TD</th>
              <th scope="col">Nama PDU</th>
              <th scope="col">Acara</th>
              <th scope="col">Status</th>
              <th scope="col">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>1 Januari 2025</td>
              <td>Mark</td>
              <td>John Doe</td>
              <td>Kopi Pagi</td>
              <td>Clear</td>
              <td>
                <img src={Pen} alt="" className="icon" />
                <img src={Trash} alt="" className="icon" />
              </td>
            </tr>
            <tr className="alert-danger">
              <td>1 Januari 2025</td>
              <td>Mark</td>
              <td>John Doe</td>
              <td>Mimbar Hindu</td>
              <td>Terdapat Kendala</td>
              <td>
                <img src={Pen} alt="" className="icon" />
                <img src={Trash} alt="" className="icon" />
              </td>
            </tr>
            <tr>
              <td>1 Januari 2025</td>
              <td>Mark</td>
              <td>John Doe</td>
              <td>Titik Kumpul</td>
              <td>Clear</td>
              <td>
                <img src={Pen} alt="" className="icon" />
                <img src={Trash} alt="" className="icon" />
              </td>
            </tr>
            <tr>
              <td>1 Januari 2025</td>
              <td>Mark</td>
              <td>John Doe</td>
              <td>Ekonomi Kreatif</td>
              <td>Clear</td>
              <td>
                <img src={Pen} alt="" className="icon" />
                <img src={Trash} alt="" className="icon" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ListTD;
