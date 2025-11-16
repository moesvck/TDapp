import React, { useState, useEffect, useRef } from 'react';
import '../assets/css/listtd.css';
import { NavLink, useNavigate } from 'react-router-dom';
import Pen from '../assets/pen-solid-full.svg';
import Trash from '../assets/trash-solid-full.svg';
import Logout from '../assets/logout.svg';
import Tambah from '../assets/tambah.svg';
import MenuIcon from '../assets/menu.svg';
import CloseIcon from '../assets/x.svg';
import { pduService, getToken, setToken } from '../services/pduService';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import io from 'socket.io-client';

const ListTD = () => {
  const [acaraData, setAcaraData] = useState([]);
  const [pduData, setPduData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState('');
  const [authChecked, setAuthChecked] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [burgerMenuOpen, setBurgerMenuOpen] = useState(false); // State untuk menu burger

  // State untuk modal edit
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAcara, setEditingAcara] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editFormData, setEditFormData] = useState({
    namaAcara: '',
    tipeAcara: '',
    kendala: false,
    buktiDukung: null,
    keteranganKendala: '',
    idPDU: '',
  });

  // State untuk delete
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [acaraToDelete, setAcaraToDelete] = useState(null);

  const { isAuthenticated, user, logout, login } = useAuth();
  const navigate = useNavigate();
  const token = getToken();
  const socketRef = useRef(null);
  const burgerMenuRef = useRef(null);

  // ✅ HANDLE CLICK OUTSIDE BURGER MENU
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        burgerMenuRef.current &&
        !burgerMenuRef.current.contains(event.target)
      ) {
        setBurgerMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // ✅ TOGGLE BURGER MENU
  const toggleBurgerMenu = () => {
    setBurgerMenuOpen(!burgerMenuOpen);
  };

  // ✅ CLOSE BURGER MENU
  const closeBurgerMenu = () => {
    setBurgerMenuOpen(false);
  };

  // ✅ SOCKET.IO IMPLEMENTATION
  const initializeSocket = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    try {
      const socket = io('http://localhost:3000', {
        auth: {
          token: token,
        },
        transports: ['websocket', 'polling'],
        timeout: 10000,
      });

      socketRef.current = socket;

      socket.on('connect', () => {
        setIsConnected(true);
      });

      socket.on('disconnect', (reason) => {
        setIsConnected(false);
        setTimeout(() => {
          if (isAuthenticated && token) {
            initializeSocket();
          }
        }, 5000);
      });

      socket.on('connect_error', (error) => {
        console.error('❌ Socket.IO Connection Error:', error);
        setIsConnected(false);
      });

      // ✅ REAL-TIME EVENTS
      socket.on('acaraUpdated', (updatedAcara) => {
        setAcaraData((prev) =>
          prev.map((acara) =>
            acara.id === updatedAcara.id
              ? {
                  ...updatedAcara,
                  kendala:
                    updatedAcara.kendala === 'Ada Kendala' ||
                    updatedAcara.kendala === true ||
                    updatedAcara.kendala === 'true',
                }
              : acara
          )
        );
        setLastUpdated(new Date().toLocaleTimeString('id-ID'));

        if (updatedAcara.namaAcara) {
          showNotification(`Acara "${updatedAcara.namaAcara}" diperbarui`);
        }
      });

      socket.on('acaraCreated', (newAcara) => {
        setAcaraData((prev) => {
          const exists = prev.find((acara) => acara.id === newAcara.id);
          if (!exists) {
            const normalizedAcara = {
              ...newAcara,
              kendala:
                newAcara.kendala === 'Ada Kendala' ||
                newAcara.kendala === true ||
                newAcara.kendala === 'true',
            };
            return [normalizedAcara, ...prev];
          }
          return prev;
        });
        setLastUpdated(new Date().toLocaleTimeString('id-ID'));

        if (newAcara.namaAcara) {
          showNotification(`Acara baru "${newAcara.namaAcara}" ditambahkan`);
        }
      });

      socket.on('acaraDeleted', (deletedAcaraData) => {
        const acaraId = deletedAcaraData.id || deletedAcaraData;
        const acaraName = deletedAcaraData.namaAcara || 'Acara';

        setAcaraData((prev) => prev.filter((acara) => acara.id !== acaraId));
        setLastUpdated(new Date().toLocaleTimeString('id-ID'));

        showNotification(`Acara "${acaraName}" dihapus`);
      });

      socket.on('dataRefreshed', () => {
        showNotification('Data diperbarui dari server');
        fetchAllData();
      });

      socket.on('error', (error) => {
        console.error('📡 Socket error:', error);
        showNotification('Error koneksi real-time', 'error');
      });

      return socket;
    } catch (error) {
      console.error('Failed to initialize socket:', error);
      return null;
    }
  };

  // ✅ NOTIFICATION FUNCTION
  const showNotification = (message, type = 'info') => {
    const notification = document.createElement('div');
    notification.className = `alert alert-${
      type === 'error' ? 'danger' : 'success'
    } alert-dismissible fade show`;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
      min-width: 300px;
      animation: slideInRight 0.3s ease-out;
    `;

    notification.innerHTML = `
      <strong>${type === 'error' ? '⚠️' : '🔔'} </strong> ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 5000);
  };

  // ✅ SOCKET.IO CLEANUP AND INITIALIZATION
  useEffect(() => {
    if (isAuthenticated && token && authChecked) {
      const socket = initializeSocket();

      return () => {
        if (socketRef.current) {
          socketRef.current.disconnect();
        }
      };
    }
  }, [isAuthenticated, token, authChecked]);

  // ✅ FUNGSI REFRESH TOKEN
  const refreshToken = async () => {
    try {
      const response = await axios.get('http://localhost:3000/token', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const newToken = response.data.token;
      setToken(newToken);
      login(newToken);

      return newToken;
    } catch (error) {
      console.error('Token refresh failed:', error);
      throw error;
    }
  };

  // ✅ FUNGSI UNTUK MEMBUAT REQUEST DENGAN AUTO REFRESH TOKEN
  const makeAuthenticatedRequest = async (requestFn) => {
    try {
      return await requestFn();
    } catch (error) {
      if (error.response?.status === 401) {
        try {
          const newToken = await refreshToken();
          const retryRequest = async () => {
            return await requestFn();
          };
          return await retryRequest();
        } catch (refreshError) {
          console.error('Token refresh failed, logging out:', refreshError);
          setError('Session expired. Redirecting to login...');
          setTimeout(() => {
            logout();
            navigate('/login', {
              replace: true,
              state: {
                message: 'Your session has expired. Please login again.',
              },
            });
          }, 2000);
          throw refreshError;
        }
      }
      throw error;
    }
  };

  // ✅ CHECK AUTHENTICATION ON COMPONENT MOUNT
  useEffect(() => {
    checkAuthentication();
  }, []);

  const checkAuthentication = async () => {
    if (!token) {
      navigate('/login');
      return;
    }

    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    try {
      await makeAuthenticatedRequest(async () => {
        await fetchAllData();
      });
      setAuthChecked(true);
    } catch (error) {
      console.error('Authentication check failed:', error);
      if (error.response?.status === 401) {
        setError('Session telah berakhir. Silakan login kembali.');
      } else {
        setError('Terjadi kesalahan. Silakan login kembali.');
      }
      setTimeout(() => {
        logout();
        navigate('/login');
      }, 2000);
    }
  };

  // ✅ HANDLE TOKEN EXPIRED EVENT
  useEffect(() => {
    const handleTokenExpired = () => {
      setError('Session expired. Redirecting to login...');
      setTimeout(() => {
        logout();
        navigate('/login', {
          replace: true,
          state: { message: 'Your session has expired. Please login again.' },
        });
      }, 2000);
    };

    window.addEventListener('tokenExpired', handleTokenExpired);
    return () => {
      window.removeEventListener('tokenExpired', handleTokenExpired);
    };
  }, [logout, navigate]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // ✅ FUNGSI UNTUK DAPATKAN CLASS STATUS
  const getStatusClass = (kendala) => {
    if (kendala === 'Ada Kendala' || kendala === true || kendala === 'true') {
      return 'alert-danger';
    }
    return '';
  };

  // ✅ FUNGSI UNTUK DAPATKAN TEKS STATUS
  const getStatusText = (kendala) => {
    if (kendala === 'Ada Kendala' || kendala === true || kendala === 'true') {
      return 'Terdapat Kendala';
    }
    return 'Clear';
  };

  // ✅ FUNGSI UNTUK BADGE STATUS
  const getStatusBadge = (kendala) => {
    if (kendala === 'Ada Kendala' || kendala === true || kendala === 'true') {
      return 'bg-danger';
    }
    return 'bg-success';
  };

  // ✅ FUNCTION UNTUK DAPATKAN NAMA PDU BERDASARKAN idPDU
  const getPDUName = (idPDU) => {
    if (!idPDU) return 'N/A';
    const pdu = pduData.find((p) => p.id === idPDU);
    return pdu ? pdu.namePDU : `PDU-${idPDU}`;
  };

  // ✅ FUNGSI UNTUK CEK APAKAH ACARA MASIH BISA DIEDIT/DIHAPUS
  const canEditDelete = (tanggalAcara) => {
    const acaraDate = new Date(tanggalAcara);
    const today = new Date();
    acaraDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return acaraDate.getTime() === today.getTime();
  };

  // ✅ FETCH SEMUA DATA: ACARA + PDU dengan auto refresh token
  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError('');

      await makeAuthenticatedRequest(async () => {
        const [acaraResponse, pduResponse] = await Promise.all([
          pduService.getAcara(),
          pduService.getPDU(),
        ]);

        const normalizedAcaraData = (acaraResponse.data || []).map((acara) => ({
          ...acara,
          kendala:
            acara.kendala === 'Ada Kendala' ||
            acara.kendala === true ||
            acara.kendala === 'true',
        }));

        setAcaraData(normalizedAcaraData);
        setPduData(pduResponse.data || []);
        setLastUpdated(new Date().toLocaleTimeString('id-ID'));
      });
    } catch (err) {
      if (!err.response?.status === 401) {
        setError(err.message || 'Gagal memuat data');
      }
    } finally {
      setLoading(false);
    }
  };

  // ✅ FUNGSI UNTUK MENDAPATKAN DATA ACARA BY ID
  const fetchAcaraById = async (id) => {
    try {
      setEditLoading(true);
      const response = await makeAuthenticatedRequest(async () => {
        return await axios.get(`http://localhost:3000/acara/${id}`, {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        });
      });

      const acaraData = response.data.data;
      const kendalaValue =
        acaraData.kendala === 'Ada Kendala' ||
        acaraData.kendala === true ||
        acaraData.kendala === 'true';

      setEditFormData({
        namaAcara: acaraData.namaAcara || '',
        tipeAcara: acaraData.tipeAcara || '',
        kendala: kendalaValue,
        buktiDukung: null,
        keteranganKendala: acaraData.keteranganKendala || '',
        idPDU: acaraData.idPDU || '',
      });

      setEditingAcara(acaraData);
      setShowEditModal(true);
    } catch (error) {
      console.error('Error fetching acara data:', error);
      alert('Gagal memuat data acara untuk edit');
    } finally {
      setEditLoading(false);
    }
  };

  // ✅ FUNGSI UNTUK HANDLE EDIT ACARA
  const handleEditAcara = async (id) => {
    await fetchAcaraById(id);
  };

  // ✅ FUNGSI UNTUK HANDLE SUBMIT EDIT DENGAN SOCKET EMIT
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingAcara) return;

    try {
      setEditLoading(true);
      const formData = new FormData();
      formData.append('namaAcara', editFormData.namaAcara);
      formData.append('tipeAcara', editFormData.tipeAcara);
      formData.append('kendala', editFormData.kendala.toString());

      if (editFormData.kendala) {
        if (
          !editFormData.keteranganKendala ||
          editFormData.keteranganKendala.trim() === ''
        ) {
          alert('Keterangan kendala wajib diisi ketika ada kendala');
          setEditLoading(false);
          return;
        }
        formData.append('keteranganKendala', editFormData.keteranganKendala);
        if (editFormData.buktiDukung) {
          formData.append('buktiDukung', editFormData.buktiDukung);
        } else if (!editingAcara.buktiDukung) {
          alert('Bukti dukung wajib diupload ketika ada kendala');
          setEditLoading(false);
          return;
        }
      } else {
        formData.append('keteranganKendala', '');
      }

      if (editFormData.idPDU) {
        formData.append('idPDU', editFormData.idPDU);
      }

      const response = await makeAuthenticatedRequest(async () => {
        return await axios.put(
          `http://localhost:3000/acara/${editingAcara.id}`,
          formData,
          {
            headers: {
              Authorization: `Bearer ${getToken()}`,
              'Content-Type': 'multipart/form-data',
            },
            timeout: 30000,
          }
        );
      });

      if (response.data.message === 'Acara updated successfully') {
        if (socketRef.current && isConnected) {
          socketRef.current.emit('acaraUpdated', response.data.data);
        }
        alert('Data acara berhasil diupdate!');
        setShowEditModal(false);
        setEditingAcara(null);
        setTimeout(() => {
          fetchAllData();
        }, 500);
      } else {
        throw new Error(response.data.message || 'Update gagal');
      }
    } catch (error) {
      console.error('❌ Error updating acara:', error);
      if (error.response) {
        const errorMessage =
          error.response.data?.message || error.response.statusText;
        alert('Gagal mengupdate data acara: ' + errorMessage);
        if (errorMessage.includes('Bukti dukung required')) {
          alert('ERROR: Bukti dukung wajib diupload ketika ada kendala');
        } else if (errorMessage.includes('Keterangan kendala required')) {
          alert('ERROR: Keterangan kendala wajib diisi ketika ada kendala');
        }
      } else if (error.request) {
        alert('Tidak ada response dari server. Periksa koneksi jaringan.');
      } else {
        alert('Gagal mengupdate data acara: ' + error.message);
      }
    } finally {
      setEditLoading(false);
    }
  };

  // ✅ FUNGSI UNTUK HANDLE INPUT CHANGE PADA FORM EDIT
  const handleEditInputChange = (e) => {
    const { name, value, type, files, checked } = e.target;
    setEditFormData((prev) => {
      let newValue;
      if (type === 'checkbox') {
        newValue = checked;
      } else if (type === 'file') {
        newValue = files[0] || null;
      } else {
        newValue = value;
      }

      const newFormData = {
        ...prev,
        [name]: newValue,
      };

      if (name === 'kendala' && !checked) {
        newFormData.buktiDukung = null;
        newFormData.keteranganKendala = '';
      }
      return newFormData;
    });
  };

  // ✅ FUNGSI UNTUK MENUTUP MODAL
  const handleCloseModal = () => {
    setShowEditModal(false);
    setEditingAcara(null);
    setEditFormData({
      namaAcara: '',
      tipeAcara: '',
      kendala: false,
      buktiDukung: null,
      keteranganKendala: '',
      idPDU: '',
    });
  };

  // ✅ FUNGSI UNTUK HANDLE DELETE ACARA
  const handleDeleteAcara = async (id, namaAcara) => {
    setAcaraToDelete({ id, namaAcara });
  };

  // ✅ FUNGSI UNTUK KONFIRMASI DELETE DENGAN SOCKET EMIT
  const confirmDelete = async () => {
    if (!acaraToDelete) return;

    try {
      setDeleteLoading(true);
      await makeAuthenticatedRequest(async () => {
        await axios.delete(`http://localhost:3000/acara/${acaraToDelete.id}`, {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        });
      });

      if (socketRef.current && isConnected) {
        socketRef.current.emit('acaraDeleted', {
          id: acaraToDelete.id,
          namaAcara: acaraToDelete.namaAcara,
        });
      }

      alert(`Acara "${acaraToDelete.namaAcara}" berhasil dihapus!`);
      setAcaraToDelete(null);
      fetchAllData();
    } catch (error) {
      console.error('Error deleting acara:', error);
      if (error.response?.status === 401) {
        alert('Session expired. Silakan login kembali.');
      } else {
        alert(
          'Gagal menghapus data acara: ' +
            (error.response?.data?.message || error.message)
        );
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  // ✅ FUNGSI UNTUK BATAL DELETE
  const cancelDelete = () => {
    setAcaraToDelete(null);
  };

  const handleLogout = () => {
    if (window.confirm('Apakah Anda yakin ingin logout?')) {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      logout();
      closeBurgerMenu();
    }
  };

  // Tampilkan loading sampai authentication check selesai
  if (!authChecked) {
    return (
      <div className="container mt-4">
        <div
          className="d-flex justify-content-center align-items-center"
          style={{ height: '50vh' }}
        >
          <div className="text-center">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <div className="mt-2">Memverifikasi authentication...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error && error.includes('Session expired')) {
    return (
      <div className="container-fluid">
        <div className="text-center mt-5">
          <div className="alert alert-warning">
            <h4>Session Expired</h4>
            <p>{error}</p>
            <div
              className="spinner-border spinner-border-sm me-2"
              role="status"
            >
              <span className="visually-hidden">Loading...</span>
            </div>
            <span>Redirecting to login...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="container-fluid">
        <div className="text-center mt-5">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="listtd-container">
      <div className="container-fluid">
        {/* Header dengan User Info & Socket Status */}
        <div className="row align-items-center mb-4 mobile-header blocktitle">
          <div className="col-12 col-md-8">
            <div className="d-flex flex-column align-items-center align-items-md-start">
              <h1 className="title mb-2 mb-md-1">
                Notebook of Technical Director.
              </h1>
              {user && (
                <div className="d-flex flex-column flex-md-row align-items-center gap-2 gap-md-3">
                  <small className="text-muted text-center text-md-start">
                    Welcome, <strong>{user.name}</strong>
                  </small>
                  <div className="vr d-none d-md-block mx-3"></div>
                  <small
                    className={`badge ${
                      isConnected ? 'bg-success' : 'bg-warning'
                    } mobile-socket-badge`}
                  ></small>
                </div>
              )}
            </div>
          </div>

          {/* Desktop/Tablet View - Tombol Logout dan Create tetap visible */}
          <div className="col-12 col-md-4 mt-3 mt-md-0 d-none d-lg-block">
            <div className="d-flex justify-content-center justify-content-md-end">
              <NavLink to={'/createedit'} className="btn btn-success">
                <img src={Tambah} alt="tambah" className="icon me-2" />
                Create New Acara
              </NavLink>
              <button
                className="btn btn-danger mobile-logout-btn me-2 "
                onClick={handleLogout}
              >
                <img src={Logout} alt="Logout" className="icon me-2" />
                Logout
              </button>
            </div>
          </div>

          {/* Mobile View - Menu Burger */}
          <div className="col-12 d-block d-lg-none">
            <div className="d-flex justify-content-between align-items-center">
              {/* Info Socket Status untuk Mobile */}
              <div className="d-flex align-items-center">
                <small
                  className={`badge ${
                    isConnected ? 'bg-success' : 'bg-warning'
                  } mobile-socket-badge me-2`}
                >
                  {isConnected ? '🟢 Connected' : '🟡 Connecting'}
                </small>
              </div>

              {/* Burger Menu Button */}
              <div className="burger-menu-container" ref={burgerMenuRef}>
                <button
                  className="btn burger-menu-btn"
                  onClick={toggleBurgerMenu}
                  aria-label="Menu"
                >
                  <img src={MenuIcon} alt="Menu" className="burger-icon" />
                </button>

                {/* Burger Menu Dropdown */}
                {burgerMenuOpen && (
                  <div className="burger-menu-dropdown">
                    <NavLink
                      to={'/createedit'}
                      className="burger-menu-item"
                      onClick={closeBurgerMenu}
                    >
                      <img
                        src={Tambah}
                        alt="tambah"
                        className="burger-menu-icon"
                      />
                      Create New Acara
                    </NavLink>
                    <button
                      className="burger-menu-item burger-menu-logout"
                      onClick={handleLogout}
                    >
                      <img
                        src={Logout}
                        alt="Logout"
                        className="burger-menu-icon"
                      />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Info Section - Hanya untuk Desktop/Tablet */}
        <div className="row mb-4 align-items-center d-none d-lg-flex">
          {/* Info - kiri */}
          <div className="col-md-8 col-12 mb-2 mb-md-0">
            {acaraData.length > 0 && (
              <div className="alert alert-info mb-0 py-2 d-inline-block">
                <div className="d-flex flex-column flex-md-row align-items-center gap-2">
                  <strong className="me-0 me-md-2">Info : &ensp; </strong>
                  <span>Menampilkan {acaraData.length} data Acara &ensp;</span>
                </div>
              </div>
            )}
          </div>

          {/* Tombol - kanan (Desktop/Tablet) */}
          <div className="col-md-4 col-12 text-md-end text-right">
            {/* Tombol Create sudah ada di header untuk desktop/tablet */}
          </div>
        </div>

        {/* Info Section untuk Mobile */}
        <div className="row mb-4 d-block d-lg-none">
          <div className="col-12">
            {acaraData.length > 0 && (
              <div className="alert alert-info mb-0 py-2 text-center">
                <div className="d-flex flex-column align-items-center gap-2">
                  <strong>Info:</strong>
                  <span>Menampilkan {acaraData.length} data Acara</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {loading && (
          <div className="text-center my-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-2 text-muted">Memuat data Acara...</p>
          </div>
        )}

        {error && !error.includes('Session expired') && (
          <div className="alert alert-danger">
            <strong>Error: </strong> {error}
          </div>
        )}

        {!loading && !error && acaraData.length === 0 && (
          <div className="alert alert-warning text-center py-5">
            <h5>📝 Tidak ada data Acara</h5>
            <p className="mb-3">Belum ada data Acara.</p>
            <NavLink to={'/createedit'} className="btn btn-primary">
              Buat Acara Pertama
            </NavLink>
          </div>
        )}

        {!loading && !error && acaraData.length > 0 && (
          <>
            {/* Desktop/Tablet View */}
            <div className="d-none d-lg-block">
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead className="table-dark">
                    <tr>
                      <th scope="col">Tanggal Acara</th>
                      <th scope="col">Nama TD</th>
                      <th scope="col">Nama PDU</th>
                      <th scope="col">Acara</th>
                      <th scope="col">Tipe Acara</th>
                      <th scope="col">Status</th>
                      <th scope="col">Keterangan</th>
                      <th scope="col">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {acaraData.map((acara) => {
                      const canAction = canEditDelete(acara.tanggalAcara);
                      return (
                        <tr
                          key={acara.id}
                          className={getStatusClass(acara.kendala)}
                        >
                          <td>
                            <strong>{formatDate(acara.tanggalAcara)}</strong>
                            <br />
                            <small className="text-muted">
                              {formatTime(acara.createdAt)}
                            </small>
                          </td>
                          <td>{user.name}</td>
                          <td>{getPDUName(acara.idPDU)}</td>
                          <td>
                            <strong>{acara.namaAcara || 'N/A'}</strong>
                          </td>
                          <td>
                            <span className="badge bg-info text-dark">
                              {acara.tipeAcara || 'N/A'}
                            </span>
                          </td>
                          <td>
                            <span
                              className={`badge ${getStatusBadge(
                                acara.kendala
                              )}`}
                            >
                              {getStatusText(acara.kendala)}
                            </span>
                          </td>
                          <td>
                            {acara.keteranganKendala &&
                            (acara.kendala === 'Ada Kendala' ||
                              acara.kendala === true ||
                              acara.kendala === 'true') ? (
                              <small className="text-muted">
                                {acara.keteranganKendala}
                              </small>
                            ) : (
                              <small className="text-muted">-</small>
                            )}
                          </td>
                          <td>
                            {canAction ? (
                              <div className="btn-group">
                                <button
                                  className="btn btn-sm btn-outline-primary"
                                  onClick={() => handleEditAcara(acara.id)}
                                  title="Edit"
                                  disabled={editLoading || deleteLoading}
                                >
                                  <img src={Pen} alt="Edit" className="icon" />
                                </button>
                                <button
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={() =>
                                    handleDeleteAcara(acara.id, acara.namaAcara)
                                  }
                                  title="Delete"
                                  disabled={editLoading || deleteLoading}
                                >
                                  <img
                                    src={Trash}
                                    alt="Delete"
                                    className="icon"
                                  />
                                </button>
                              </div>
                            ) : (
                              <small className="text-muted">
                                Tidak tersedia
                              </small>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile View - IMPROVED LAYOUT */}
            <div className="d-block d-lg-none">
              <div className="row g-3 mobile-acara-list">
                {acaraData.map((acara) => {
                  const canAction = canEditDelete(acara.tanggalAcara);
                  return (
                    <div key={acara.id} className="col-12">
                      <div
                        className={`card mobile-acara-card ${getStatusClass(
                          acara.kendala
                        )}`}
                      >
                        <div className="card-body">
                          {/* Header dengan Nama Acara dan Status */}
                          <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center mb-3 mobile-card-header">
                            <h6 className="card-title mb-2 mb-sm-0 mobile-card-title">
                              {acara.namaAcara || 'N/A'}
                            </h6>
                            <span
                              className={`badge ${getStatusBadge(
                                acara.kendala
                              )} mobile-status-badge`}
                            >
                              {getStatusText(acara.kendala)}
                            </span>
                          </div>

                          {/* Informasi Tanggal dan Waktu */}
                          <div className="row small text-muted mb-3 mobile-date-time">
                            <div className="col-6">
                              <strong>Tanggal:</strong>
                              <div className="mt-1">
                                {formatDate(acara.tanggalAcara)}
                              </div>
                            </div>
                            <div className="col-6">
                              <strong>Waktu:</strong>
                              <div className="mt-1">
                                {formatTime(acara.createdAt)}
                              </div>
                            </div>
                          </div>

                          {/* Informasi TD dan PDU */}
                          <div className="row small mb-3 mobile-td-pdu">
                            <div className="col-6">
                              <strong>TD:</strong>
                              <div className="mt-1">{user.name}</div>
                            </div>
                            <div className="col-6">
                              <strong>PDU:</strong>
                              <div className="mt-1">
                                {getPDUName(acara.idPDU)}
                              </div>
                            </div>
                          </div>

                          {/* Tipe Acara */}
                          <div className="mb-3 mobile-tipe-acara">
                            <span className="badge bg-info text-dark">
                              {acara.tipeAcara || 'N/A'}
                            </span>
                          </div>

                          {/* Keterangan Kendala */}
                          {acara.keteranganKendala &&
                            (acara.kendala === 'Ada Kendala' ||
                              acara.kendala === true ||
                              acara.kendala === 'true') && (
                              <div className="mb-3 mobile-keterangan">
                                <small>
                                  <strong>Keterangan:</strong>
                                </small>
                                <div className="mt-1 small text-muted">
                                  {acara.keteranganKendala}
                                </div>
                              </div>
                            )}

                          {/* Action Buttons */}
                          {canAction && (
                            <div className="d-flex justify-content-center gap-2 mt-4 mobile-action-buttons">
                              <button
                                className="btn btn-sm btn-outline-primary mobile-edit-btn"
                                onClick={() => handleEditAcara(acara.id)}
                                title="Edit"
                                disabled={editLoading || deleteLoading}
                              >
                                <img
                                  src={Pen}
                                  alt="Edit"
                                  className="icon me-1"
                                />
                                <span>&nbsp;Edit</span>
                              </button>
                              <button
                                className="btn btn-sm btn-outline-danger mobile-delete-btn"
                                onClick={() =>
                                  handleDeleteAcara(acara.id, acara.namaAcara)
                                }
                                title="Delete"
                                disabled={editLoading || deleteLoading}
                              >
                                <img
                                  src={Trash}
                                  alt="Delete"
                                  className="icon me-1"
                                />
                                <span>&nbsp;Hapus</span>
                              </button>
                            </div>
                          )}

                          {/* Tidak dapat diedit/dihapus */}
                          {!canAction && (
                            <div className="text-center mt-3 mobile-no-action">
                              <small className="text-muted">
                                Tidak dapat diedit/dihapus
                              </small>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Modal Edit Acara */}
        {showEditModal && (
          <div
            className="modal fade show"
            style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}
          >
            <div className="modal-dialog modal-lg mobile-modal">
              <div className="modal-content">
                <div className="modal-header">
                  <h4 className="modal-title mobile-modal-title">
                    Edit Acara - {editingAcara?.namaAcara}
                  </h4>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={handleCloseModal}
                    disabled={editLoading}
                  >
                    X
                  </button>
                </div>
                <form onSubmit={handleEditSubmit}>
                  <div className="modal-body">
                    {editLoading ? (
                      <div className="text-center py-3">
                        <div className="spinner-border" role="status">
                          <span className="visually-hidden">Loading...</span>
                        </div>
                        <p className="mt-2">Memuat data acara...</p>
                      </div>
                    ) : (
                      <div className="row mobile-form-row">
                        {/* Nama Acara */}
                        <div className="mb-3 col-12">
                          <label className="form-label">
                            Nama Acara<span className="text-danger">*</span>
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Enter nama acara"
                            name="namaAcara"
                            value={editFormData.namaAcara}
                            onChange={handleEditInputChange}
                            required
                            autocomplete="off"
                          />
                        </div>

                        {/* Tipe Acara */}
                        <div className="mb-3 col-12">
                          <label className="form-label d-block">
                            Tipe Acara<span className="text-danger">*</span>
                          </label>
                          <div className="d-flex flex-column flex-sm-row gap-2 gap-sm-3 mobile-radio-group form-check form-check-inline">
                            <div className="form-check">
                              <input
                                className="form-check-input"
                                type="radio"
                                name="tipeAcara"
                                value="Live"
                                id="editLive"
                                checked={editFormData.tipeAcara === 'Live'}
                                onChange={handleEditInputChange}
                                required
                              />
                              <label
                                className="form-check-label"
                                htmlFor="editLive"
                              >
                                Live
                              </label>
                            </div>
                            <div className="form-check">
                              <input
                                className="form-check-input"
                                type="radio"
                                name="tipeAcara"
                                value="Tipping"
                                id="editTipping"
                                checked={editFormData.tipeAcara === 'Tipping'}
                                onChange={handleEditInputChange}
                              />
                              <label
                                className="form-check-label"
                                htmlFor="editTipping"
                              >
                                Tipping
                              </label>
                            </div>
                            <div className="form-check">
                              <input
                                className="form-check-input"
                                type="radio"
                                name="tipeAcara"
                                value="Playback"
                                id="editPlayback"
                                checked={editFormData.tipeAcara === 'Playback'}
                                onChange={handleEditInputChange}
                              />
                              <label
                                className="form-check-label"
                                htmlFor="editPlayback"
                              >
                                Playback
                              </label>
                            </div>
                          </div>
                        </div>

                        {/* PDU */}
                        <div className="mb-3 col-12">
                          <label className="form-label">PDU</label>
                          <select
                            className="form-control"
                            name="idPDU"
                            value={editFormData.idPDU}
                            onChange={handleEditInputChange}
                          >
                            <option value="">Pilih PDU</option>
                            {pduData.map((pdu) => (
                              <option key={pdu.id} value={pdu.id}>
                                {pdu.namePDU} {pdu.lokasi}
                              </option>
                            ))}
                          </select>
                          {/* <label className="form-label">PDU</label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Enter nama PDU"
                            name="idPDU"
                            value={editFormData.idPDU.namePDU}
                            onChange={handleEditInputChange}
                            autocomplete="off"
                            required
                          /> */}
                        </div>

                        {/* Kendala */}
                        <div className="mb-3 col-12">
                          <div className="form-check form-switch form-check-inline">
                            <input
                              className="form-check-input btnKendala"
                              type="checkbox"
                              role="switch"
                              name="kendala"
                              checked={editFormData.kendala}
                              onChange={handleEditInputChange}
                              id="editKendala"
                            />
                            <label
                              className="form-check-label"
                              htmlFor="editKendala"
                            >
                              <strong>Ada Kendala?</strong>
                              {editFormData.kendala && (
                                <small className="text-danger ms-2">
                                  (Wajib upload bukti dan isi keterangan)
                                </small>
                              )}
                            </label>
                          </div>
                        </div>

                        {/* Bukti Dukungan Kendala */}
                        {editFormData.kendala && (
                          <div className="mb-3 col-12">
                            <label className="form-label">
                              Bukti Dukungan Kendala
                              <span className="text-danger">*</span>
                              {editingAcara?.buktiDukung && (
                                <small className="text-muted ms-2">
                                  (File saat ini: {editingAcara.buktiDukung})
                                </small>
                              )}
                            </label>
                            <input
                              className="form-control"
                              type="file"
                              name="buktiDukung"
                              onChange={handleEditInputChange}
                              accept=".jpg,.jpeg,.png,.pdf"
                              required={!editingAcara?.buktiDukung}
                            />
                            <small className="text-muted">
                              {editingAcara?.buktiDukung
                                ? 'Kosongkan jika tidak ingin mengubah file'
                                : 'Wajib diupload ketika ada kendala'}
                            </small>
                          </div>
                        )}

                        {/* Keterangan Kendala */}
                        {editFormData.kendala && (
                          <div className="mb-3 col-12">
                            <label className="form-label">
                              Keterangan Kendala
                              <span className="text-danger">*</span>
                            </label>
                            <textarea
                              className="form-control"
                              rows="3"
                              name="keteranganKendala"
                              value={editFormData.keteranganKendala}
                              onChange={handleEditInputChange}
                              placeholder="Jelaskan kendala yang dialami..."
                              required
                            ></textarea>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="modal-footer mobile-modal-footer">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handleCloseModal}
                      disabled={editLoading}
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={editLoading}
                    >
                      {editLoading ? 'Menyimpan...' : 'Simpan Perubahan'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Modal Konfirmasi Delete */}
        {acaraToDelete && (
          <div
            className="modal fade show"
            style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}
          >
            <div className="modal-dialog mobile-modal">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title text-danger">
                    <i className="fas fa-exclamation-triangle me-2"></i>
                    Konfirmasi Hapus
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={cancelDelete}
                    disabled={deleteLoading}
                  ></button>
                </div>
                <div className="modal-body">
                  <div className="alert alert-warning">
                    <strong>Peringatan!</strong> Tindakan ini tidak dapat
                    dibatalkan.
                  </div>
                  <p>
                    Apakah Anda yakin ingin menghapus acara:
                    <br />
                    <strong>"{acaraToDelete.namaAcara}"</strong>?
                  </p>
                  <small className="text-muted">
                    Data yang dihapus tidak dapat dikembalikan.
                  </small>
                </div>
                <div className="modal-footer mobile-modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={cancelDelete}
                    disabled={deleteLoading}
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={confirmDelete}
                    disabled={deleteLoading}
                  >
                    {deleteLoading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Menghapus...
                      </>
                    ) : (
                      'Ya, Hapus'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ListTD;
