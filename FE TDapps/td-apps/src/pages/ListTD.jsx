import React, { useState, useEffect } from 'react';
import '../assets/css/listtd.css';
import { NavLink, useNavigate } from 'react-router-dom';
import Pen from '../assets/pen-solid-full.svg';
import Trash from '../assets/trash-solid-full.svg';
import Refresh from '../assets/refresh.svg';
import Logout from '../assets/logout.svg';
import { pduService, getToken, setToken } from '../services/pduService';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const ListTD = () => {
  const [acaraData, setAcaraData] = useState([]);
  const [pduData, setPduData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState('');
  const [authChecked, setAuthChecked] = useState(false);

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

  // Fungsi untuk refresh token
  const refreshToken = async () => {
    try {
      console.log('Attempting to refresh token...');
      const response = await axios.get('http://localhost:3000/token', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const newToken = response.data.token;
      console.log('Token refreshed successfully');

      // Simpan token baru
      setToken(newToken);
      login(newToken);

      return newToken;
    } catch (error) {
      console.error('Token refresh failed:', error);
      throw error;
    }
  };

  // Fungsi untuk membuat request dengan auto refresh token
  const makeAuthenticatedRequest = async (requestFn) => {
    try {
      // Coba request pertama
      return await requestFn();
    } catch (error) {
      // Jika error 401 (Unauthorized), coba refresh token
      if (error.response?.status === 401) {
        console.log('Token expired, attempting refresh...');
        try {
          const newToken = await refreshToken();

          // Coba request lagi dengan token baru
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

  // Check authentication on component mount
  useEffect(() => {
    checkAuthentication();
  }, []);

  const checkAuthentication = async () => {
    // Cek 1: Apakah ada token di localStorage?
    if (!token) {
      console.log('No token found, redirecting to login');
      navigate('/login');
      return;
    }

    // Cek 2: Apakah user authenticated di context?
    if (!isAuthenticated) {
      console.log('User not authenticated in context, redirecting to login');
      navigate('/login');
      return;
    }

    try {
      // Cek 3: Coba fetch data untuk verifikasi token dengan auto refresh
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
      console.log('Token expired event received');
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

  // ✅ FUNGSI UNTUK DAPATKAN CLASS STATUS - DIPERBAIKI
  const getStatusClass = (kendala) => {
    // Handle semua kemungkinan format kendala
    if (kendala === 'Ada Kendala' || kendala === true || kendala === 'true') {
      return 'alert-danger';
    }
    return ''; // Tidak ada class tambahan
  };

  // ✅ FUNGSI UNTUK DAPATKAN TEKS STATUS - DIPERBAIKI
  const getStatusText = (kendala) => {
    // Handle semua kemungkinan format kendala
    if (kendala === 'Ada Kendala' || kendala === true || kendala === 'true') {
      return 'Terdapat Kendala';
    }
    return 'Clear';
  };

  // ✅ FUNGSI UNTUK BADGE STATUS - DIPERBAIKI
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

    // Set waktu ke 00:00:00 untuk kedua tanggal untuk komparasi yang akurat
    acaraDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    // Bisa edit/hapus hanya jika tanggal acara sama dengan hari ini
    return acaraDate.getTime() === today.getTime();
  };

  // ✅ FETCH SEMUA DATA: ACARA + PDU dengan auto refresh token
  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError('');

      await makeAuthenticatedRequest(async () => {
        // ✅ FETCH KEDUA DATA SECARA PARALEL
        const [acaraResponse, pduResponse] = await Promise.all([
          pduService.getAcara(),
          pduService.getPDU(),
        ]);

        console.log('📦 Acara data:', acaraResponse.data);
        console.log('📦 PDU data:', pduResponse.data);

        // Normalisasi data kendala untuk konsistensi
        const normalizedAcaraData = (acaraResponse.data || []).map((acara) => ({
          ...acara,
          // Pastikan kendala dalam format yang konsisten
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
      console.error('Error fetching data:', err);

      // Error sudah ditangani di makeAuthenticatedRequest, tidak perlu handle lagi
      if (!err.response?.status === 401) {
        setError(err.message || 'Gagal memuat data');
      }
    } finally {
      setLoading(false);
    }
  };

  // ✅ FUNGSI UNTUK MENDAPATKAN DATA ACARA BY ID - DIPERBAIKI
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
      console.log('📥 Data acara dari backend untuk edit:', acaraData);

      // ✅ PERBAIKAN: Mapping kendala yang benar dari backend
      const kendalaValue =
        acaraData.kendala === 'Ada Kendala' ||
        acaraData.kendala === true ||
        acaraData.kendala === 'true';

      setEditFormData({
        namaAcara: acaraData.namaAcara || '',
        tipeAcara: acaraData.tipeAcara || '',
        kendala: kendalaValue,
        buktiDukung: null, // Reset file input
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
    console.log('Edit acara dengan ID:', id);
    await fetchAcaraById(id);
  };

  // ✅ FUNGSI UNTUK HANDLE SUBMIT EDIT - DIPERBAIKI SECARA MENYELURUH
  const handleEditSubmit = async (e) => {
    e.preventDefault();

    if (!editingAcara) return;

    try {
      setEditLoading(true);

      const formData = new FormData();

      // ✅ TAMBAHKAN SEMUA FIELD YANG DIPERLUKAN
      formData.append('namaAcara', editFormData.namaAcara);
      formData.append('tipeAcara', editFormData.tipeAcara);

      // ✅ PERBAIKAN PENTING: Kirim kendala sebagai boolean string
      formData.append('kendala', editFormData.kendala.toString());

      console.log('🔍 Data yang akan dikirim:');
      console.log('- namaAcara:', editFormData.namaAcara);
      console.log('- tipeAcara:', editFormData.tipeAcara);
      console.log('- kendala:', editFormData.kendala);

      // ✅ PERBAIKAN: Handle kendala dan keterangan dengan benar
      if (editFormData.kendala) {
        // Jika ada kendala, kirim keterangan (WAJIB diisi)
        if (
          !editFormData.keteranganKendala ||
          editFormData.keteranganKendala.trim() === ''
        ) {
          alert('Keterangan kendala wajib diisi ketika ada kendala');
          setEditLoading(false);
          return;
        }

        formData.append('keteranganKendala', editFormData.keteranganKendala);
        console.log('- keteranganKendala:', editFormData.keteranganKendala);

        // ✅ PERBAIKAN: Handle file upload - jika ada file baru atau file lama sudah ada
        if (editFormData.buktiDukung) {
          formData.append('buktiDukung', editFormData.buktiDukung);
          console.log(
            '- buktiDukung (file baru):',
            editFormData.buktiDukung.name
          );
        } else if (editingAcara.buktiDukung) {
          console.log('- buktiDukung: menggunakan file lama');
          // Backend akan handle file lama
        } else {
          alert('Bukti dukung wajib diupload ketika ada kendala');
          setEditLoading(false);
          return;
        }
      } else {
        // Jika tidak ada kendala, kirim string kosong untuk keterangan
        formData.append('keteranganKendala', '');
        console.log('- keteranganKendala: (dikosongkan)');
      }

      // ✅ Tambahkan idPDU jika ada
      if (editFormData.idPDU) {
        formData.append('idPDU', editFormData.idPDU);
        console.log('- idPDU:', editFormData.idPDU);
      }

      // ✅ DEBUG: Tampilkan semua data di FormData
      console.log('📤 SEMUA DATA YANG DIKIRIM KE BACKEND:');
      for (let [key, value] of formData.entries()) {
        if (key === 'buktiDukung') {
          console.log(
            `- ${key}:`,
            value.name,
            `(File: ${value.type}, Size: ${value.size} bytes)`
          );
        } else {
          console.log(`- ${key}:`, value);
        }
      }

      // ✅ KIRIM KE BACKEND
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

      console.log('✅ Response sukses dari backend:', response.data);

      if (response.data.message === 'Acara updated successfully') {
        alert('Data acara berhasil diupdate!');
        setShowEditModal(false);
        setEditingAcara(null);

        // Refresh data
        setTimeout(() => {
          fetchAllData();
        }, 500);
      } else {
        throw new Error(response.data.message || 'Update gagal');
      }
    } catch (error) {
      console.error('❌ Error updating acara:', error);

      // ✅ TAMPILKAN ERROR DETAIL DARI BACKEND
      if (error.response) {
        console.error('❌ Response error data:', error.response.data);
        console.error('❌ Response error status:', error.response.status);

        const errorMessage =
          error.response.data?.message || error.response.statusText;
        alert('Gagal mengupdate data acara: ' + errorMessage);

        // ✅ TAMPILKAN PESAN ERROR SPESIFIK
        if (errorMessage.includes('Bukti dukung required')) {
          alert('ERROR: Bukti dukung wajib diupload ketika ada kendala');
        } else if (errorMessage.includes('Keterangan kendala required')) {
          alert('ERROR: Keterangan kendala wajib diisi ketika ada kendala');
        }
      } else if (error.request) {
        console.error('❌ Request error:', error.request);
        alert('Tidak ada response dari server. Periksa koneksi jaringan.');
      } else {
        console.error('❌ Error message:', error.message);
        alert('Gagal mengupdate data acara: ' + error.message);
      }
    } finally {
      setEditLoading(false);
    }
  };

  // ✅ FUNGSI UNTUK HANDLE INPUT CHANGE PADA FORM EDIT - DIPERBAIKI
  const handleEditInputChange = (e) => {
    const { name, value, type, files, checked } = e.target;

    console.log(`🔄 Input changed: ${name}`, {
      value,
      type,
      files: files ? files[0]?.name : 'none',
      checked,
    });

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

      // ✅ PERBAIKAN: Reset buktiDukung dan keteranganKendala ketika kendala diubah dari true ke false
      if (name === 'kendala' && !checked) {
        console.log(
          '🔄 Kendala diubah menjadi false, reset file dan keterangan'
        );
        newFormData.buktiDukung = null;
        newFormData.keteranganKendala = '';
      }

      // Log perubahan form data
      console.log('📝 FormData updated:', newFormData);
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
    // Set data acara yang akan dihapus untuk konfirmasi
    setAcaraToDelete({ id, namaAcara });
  };

  // ✅ FUNGSI UNTUK KONFIRMASI DELETE
  const confirmDelete = async () => {
    if (!acaraToDelete) return;

    try {
      setDeleteLoading(true);

      await makeAuthenticatedRequest(async () => {
        // Gunakan axios langsung untuk delete
        await axios.delete(`http://localhost:3000/acara/${acaraToDelete.id}`, {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        });
      });

      alert(`Acara "${acaraToDelete.namaAcara}" berhasil dihapus!`);

      // Reset state
      setAcaraToDelete(null);

      // Refresh data setelah delete
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

  const handleRefresh = () => {
    fetchAllData();
  };

  const handleLogout = () => {
    if (window.confirm('Apakah Anda yakin ingin logout?')) {
      logout();
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

  // ✅ TOKEN EXPIRED STATE
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
    <div>
      <div className="container-fluid">
        {/* Header dengan User Info */}
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div>
            <h1 className="title mb-0">Notebook of Technical Director.</h1>
            {user && (
              <small className="text-muted">
                Welcome, <strong>{user.name}</strong> ({user.role})
              </small>
            )}
          </div>
          <div className="d-flex gap-2">
            <button
              className="btn btn-outline-secondary"
              onClick={handleRefresh}
              disabled={loading}
            >
              <img src={Refresh} alt="Refresh" className="icon me-2" />
              {loading ? 'Loading...' : 'Refresh'}
            </button>
            <button className="btn btn-outline-danger" onClick={handleLogout}>
              <img src={Logout} alt="Logout" className="icon me-2" />
              Logout
            </button>
          </div>
        </div>

        {/* Info Section */}
        <div className="row mb-3">
          <div className="col-md-8">
            {acaraData.length > 0 && (
              <div className="alert alert-info">
                <strong>Info: </strong>
                Menampilkan {acaraData.length} data Acara
                {lastUpdated && (
                  <small className="ms-2">
                    (Terakhir update: {lastUpdated})
                  </small>
                )}
              </div>
            )}
          </div>
          <div className="col-md-4 text-end">
            <NavLink to={'/createedit'} className="btn btn-success">
              + Create New Acara
            </NavLink>
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
            <button
              className="btn btn-sm btn-outline-danger ms-3"
              onClick={fetchAllData}
            >
              Coba Lagi
            </button>
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
          <div className="table-responsive">
            <table className="table table-striped table-hover">
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

                  // Debug log untuk memeriksa data kendala
                  console.log(
                    `Acara: ${acara.namaAcara}, Kendala:`,
                    acara.kendala,
                    `Type:`,
                    typeof acara.kendala
                  );

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
                          className={`badge ${getStatusBadge(acara.kendala)}`}
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
                              <img src={Trash} alt="Delete" className="icon" />
                            </button>
                          </div>
                        ) : (
                          <small className="text-muted">Tidak tersedia</small>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Modal Edit Acara */}
        {showEditModal && (
          <div
            className="modal fade show"
            style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}
          >
            <div className="modal-dialog modal-lg">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">
                    Edit Acara - {editingAcara?.namaAcara}
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={handleCloseModal}
                    disabled={editLoading}
                  ></button>
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
                      <div className="row">
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
                          />
                        </div>

                        {/* Tipe Acara - DIPERBAIKI: TAMBAH PLAYBACK */}
                        <div className="mb-3 col-12">
                          <label className="form-label d-block">
                            Tipe Acara<span className="text-danger">*</span>
                          </label>
                          <div className="d-flex gap-3 flex-wrap">
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
                                {pdu.namePDU} - {pdu.lokasi}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Kendala - menggunakan checkbox untuk boolean */}
                        <div className="mb-3 col-12">
                          <div className="form-check form-switch">
                            <input
                              className="form-check-input"
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

                        {/* Bukti Dukungan Kendala - Hanya tampil jika kendala = true */}
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
                              required={!editingAcara?.buktiDukung} // Wajib jika tidak ada file lama
                            />
                            <small className="text-muted">
                              {editingAcara?.buktiDukung
                                ? 'Kosongkan jika tidak ingin mengubah file'
                                : 'Wajib diupload ketika ada kendala'}
                            </small>
                          </div>
                        )}

                        {/* Keterangan Kendala - Hanya tampil jika kendala = true */}
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
                  <div className="modal-footer">
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
            <div className="modal-dialog">
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
                <div className="modal-footer">
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
