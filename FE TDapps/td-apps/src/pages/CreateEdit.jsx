import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { getToken, setToken } from '../services/pduService';
import '../assets/css/createedit.css';

const CreateEdit = () => {
  const [addPDU, setAddPDU] = useState(false);
  const [pduList, setPduList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated, logout, login } = useAuth();
  const token = getToken();

  // Konstanta untuk tipe file yang diizinkan
  const ALLOWED_FILE_TYPES = {
    images: ['image/jpeg', 'image/jpg', 'image/png'],
    pdf: ['application/pdf'],
    all: ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'],
  };

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  const [formData, setFormData] = useState({
    namePDU: '',
    buktiSuratPerintahOperasional: null,
    buktiRondownAcaraHarian: null,
    idPDU: '',
    namaAcara: '',
    tipeAcara: '',
    kendala: false,
    buktiDukung: null,
    keteranganKendala: '',
  });

  // Fungsi validasi file
  const validateFile = (file, fieldName) => {
    if (!ALLOWED_FILE_TYPES.all.includes(file.type)) {
      throw new Error(
        `${fieldName} hanya menerima file gambar (JPG, JPEG, PNG) dan PDF`
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`${fieldName} maksimal 10MB`);
    }

    return true;
  };

  // Check authentication on component mount
  useEffect(() => {
    checkAuthentication();
  }, []);

  // Fungsi untuk refresh token
  const refreshToken = async () => {
    try {
      console.log('Attempting to refresh token...');

      // ✅ Request tanpa Authorization header, karena refresh token ada di cookies
      const response = await axios.get('http://localhost:3000/token', {
        withCredentials: true, // ✅ Penting untuk mengirim cookies
      });

      const newToken = response.data.accessToken; // ✅ Perhatikan: accessToken, bukan token
      console.log('Token refreshed successfully');

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
      return await requestFn();
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('Token expired, attempting refresh...');
        try {
          const newToken = await refreshToken();

          // ✅ Recreate request function dengan token baru
          const retryRequest = async () => {
            // Karena token sudah disimpan di context, request berikutnya akan otomatis menggunakan token baru
            return await requestFn();
          };

          return await retryRequest();
        } catch (refreshError) {
          console.error('Token refresh failed, logging out:', refreshError);
          logout();
          navigate('/login');
          throw refreshError;
        }
      }
      throw error;
    }
  };

  const checkAuthentication = async () => {
    if (!token) {
      console.log('No token found, redirecting to login');
      navigate('/login');
      return;
    }

    if (!isAuthenticated) {
      console.log('User not authenticated in context, redirecting to login');
      navigate('/login');
      return;
    }

    try {
      await makeAuthenticatedRequest(async () => {
        await fetchTodayPDUList();
      });

      setAuthChecked(true);
    } catch (error) {
      console.error('Authentication check failed:', error);

      if (error.response?.status === 401) {
        alert('Session telah berakhir. Silakan login kembali.');
      } else {
        alert('Terjadi kesalahan. Silakan login kembali.');
      }

      logout();
      navigate('/login');
    }
  };

  // Fungsi untuk mendapatkan tanggal hari ini dalam format YYYY-MM-DD
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // Fungsi untuk memfilter PDU hanya yang dibuat hari ini
  const filterTodayPDU = (pduArray) => {
    const today = getTodayDate();
    const todayPDU = pduArray.filter((pdu) => {
      const pduDate = new Date(pdu.tanggal).toISOString().split('T')[0];
      return pduDate === today;
    });
    return todayPDU;
  };

  // Fetch data PDU dan filter hanya yang hari ini
  const fetchTodayPDUList = async () => {
    try {
      const today = getTodayDate();
      const currentToken = getToken();

      const response = await axios.get(
        `http://localhost:3000/pdu?date=${today}`,
        {
          headers: {
            Authorization: `Bearer ${currentToken}`,
          },
        }
      );

      let todayPDUList = response.data.data || [];

      if (
        todayPDUList.some((pdu) => {
          const pduDate = new Date(pdu.tanggal).toISOString().split('T')[0];
          return pduDate !== today;
        })
      ) {
        todayPDUList = filterTodayPDU(todayPDUList);
      }

      setPduList(todayPDUList);
    } catch (error) {
      console.error('Error fetching PDU with date filter:', error);

      try {
        const currentToken = getToken();
        const response = await axios.get('http://localhost:3000/pdu', {
          headers: {
            Authorization: `Bearer ${currentToken}`,
          },
        });

        const todayPDUList = filterTodayPDU(response.data.data || []);
        setPduList(todayPDUList);
      } catch (fallbackError) {
        console.error('Error in fallback PDU fetch:', fallbackError);
        throw fallbackError;
      }
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, files, checked } = e.target;

    setFormData((prev) => {
      const newFormData = {
        ...prev,
        [name]:
          type === 'checkbox' ? checked : type === 'file' ? files[0] : value,
      };

      if (name === 'kendala' && !checked) {
        newFormData.buktiDukung = null;
        newFormData.keteranganKendala = '';
      }

      return newFormData;
    });
  };

  // Fungsi khusus untuk handle file upload dengan validasi
  const handleFileChange = (e) => {
    const { name, files } = e.target;
    const file = files[0];

    if (!file) {
      setFormData((prev) => ({
        ...prev,
        [name]: null,
      }));
      return;
    }

    try {
      let fieldName = '';
      switch (name) {
        case 'buktiSuratPerintahOperasional':
          fieldName = 'Surat Perintah Operasional';
          break;
        case 'buktiRondownAcaraHarian':
          fieldName = 'Rundown Acara Harian';
          break;
        case 'buktiDukung':
          fieldName = 'Bukti Dukungan Kendala';
          break;
        default:
          fieldName = 'File';
      }

      validateFile(file, fieldName);

      setFormData((prev) => ({
        ...prev,
        [name]: file,
      }));
    } catch (error) {
      alert(error.message);
      e.target.value = '';
      setFormData((prev) => ({
        ...prev,
        [name]: null,
      }));
    }
  };

  const handleKendalaChange = (e) => {
    const hasKendala = e.target.value === 'true';

    setFormData((prev) => {
      const newFormData = {
        ...prev,
        kendala: hasKendala,
      };

      if (!hasKendala) {
        newFormData.buktiDukung = null;
        newFormData.keteranganKendala = '';
      }

      return newFormData;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!token || !isAuthenticated) {
      alert('Anda harus login terlebih dahulu');
      navigate('/login');
      return;
    }

    // Validasi form
    if (!addPDU && !formData.idPDU) {
      alert('Pilih PDU yang sudah ada');
      return;
    }

    if (addPDU && !formData.namePDU) {
      alert('Nama PDU wajib diisi');
      return;
    }

    if (!formData.namaAcara) {
      alert('Nama Acara wajib diisi');
      return;
    }

    if (!formData.tipeAcara) {
      alert('Tipe Acara wajib dipilih');
      return;
    }

    if (formData.kendala === true) {
      if (!formData.buktiDukung) {
        alert('Bukti Dukungan Kendala wajib diupload');
        return;
      }
      if (!formData.keteranganKendala.trim()) {
        alert('Keterangan Kendala wajib diisi');
        return;
      }
    }

    if (addPDU) {
      if (!formData.buktiSuratPerintahOperasional) {
        alert('Surat Perintah Operasional wajib diupload');
        return;
      }
      if (!formData.buktiRondownAcaraHarian) {
        alert('Rundown Acara Harian wajib diupload');
        return;
      }
    }

    setLoading(true);

    try {
      await makeAuthenticatedRequest(async () => {
        const currentToken = getToken();
        const headers = {
          Authorization: `Bearer ${currentToken}`,
          'Content-Type': 'multipart/form-data',
        };

        if (addPDU) {
          await createPDUAndAcara(headers);
        } else {
          await createAcara(headers);
        }

        alert(
          addPDU ? 'PDU dan Acara berhasil dibuat!' : 'Acara berhasil dibuat!'
        );
        navigate('/');
      });
    } catch (error) {
      console.error('Error submitting form:', error);

      if (error.response?.status === 401) {
        alert('Session expired. Silakan login kembali.');
        logout();
        navigate('/login');
      } else {
        alert(
          'Gagal menyimpan data: ' +
            (error.response?.data?.message || error.message)
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const createPDUAndAcara = async (headers) => {
    if (
      !formData.buktiSuratPerintahOperasional ||
      !formData.buktiRondownAcaraHarian
    ) {
      throw new Error('Semua file PDU harus diupload');
    }

    const pduFormData = new FormData();
    pduFormData.append('namePDU', formData.namePDU);
    pduFormData.append(
      'buktiSuratPerintahOperasional',
      formData.buktiSuratPerintahOperasional
    );
    pduFormData.append(
      'buktiRondownAcaraHarian',
      formData.buktiRondownAcaraHarian
    );

    const pduResponse = await axios.post(
      'http://localhost:3000/pdu',
      pduFormData,
      { headers }
    );

    const newPDUId = pduResponse.data.data.id;

    const acaraData = {
      idPDU: newPDUId,
      namaAcara: formData.namaAcara,
      tipeAcara: formData.tipeAcara,
      kendala: formData.kendala,
    };

    if (formData.kendala === true) {
      if (formData.buktiDukung) {
        acaraData.buktiDukung = formData.buktiDukung;
      }
      if (formData.keteranganKendala) {
        acaraData.keteranganKendala = formData.keteranganKendala;
      }
    }

    const acaraFormData = new FormData();
    Object.keys(acaraData).forEach((key) => {
      acaraFormData.append(key, acaraData[key]);
    });

    await axios.post('http://localhost:3000/acara', acaraFormData, { headers });
  };

  const createAcara = async (headers) => {
    const acaraData = {
      idPDU: formData.idPDU,
      namaAcara: formData.namaAcara,
      tipeAcara: formData.tipeAcara,
      kendala: formData.kendala,
    };

    if (formData.kendala === true) {
      if (formData.buktiDukung) {
        acaraData.buktiDukung = formData.buktiDukung;
      }
      if (formData.keteranganKendala) {
        acaraData.keteranganKendala = formData.keteranganKendala;
      }
    }

    const acaraFormData = new FormData();
    Object.keys(acaraData).forEach((key) => {
      acaraFormData.append(key, acaraData[key]);
    });

    await axios.post('http://localhost:3000/acara', acaraFormData, { headers });
  };

  const handleCancel = () => {
    navigate('/');
  };

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

  return (
    <div className="container create-edit-container">
      <div className="form-card">
        <form className="form-content" onSubmit={handleSubmit}>
          <div className="form-header">
            <h3 className="form-title">Create Data</h3>
            <p className="form-subtitle">
              Enter the required information below to create new data. Please
              fill out the form completely.
            </p>
          </div>

          <div className="form-body">
            {/* Nama PDU Section */}
            <div className="form-section">
              <div className="pdu-selection">
                <div className="pdu-header">
                  <label className="form-label">
                    Nama PDU<span className="text-danger">*</span>
                  </label>
                  <button
                    type="button"
                    className="btn-toggle-pdu"
                    onClick={() => setAddPDU(!addPDU)}
                  >
                    {addPDU ? 'Pilih PDU yang Ada' : 'Buat PDU Baru'}
                  </button>
                </div>

                {addPDU ? (
                  <div className="pdu-new">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Enter name PDU"
                      name="namePDU"
                      value={formData.namePDU}
                      onChange={handleInputChange}
                      autocomplete="off"
                      required
                    />
                    <small className="form-text">Masukkan nama PDU baru</small>
                  </div>
                ) : (
                  <div className="pdu-existing">
                    <select
                      className="form-select"
                      name="idPDU"
                      value={formData.idPDU}
                      onChange={handleInputChange}
                      autocomplete="off"
                      required
                      disabled={pduList.length === 0}
                    >
                      <option value="">
                        Pilih PDU ({pduList.length} tersedia hari ini)
                      </option>
                      {pduList.map((pdu) => (
                        <option key={pdu.id} value={pdu.id}>
                          {pdu.namePDU}
                        </option>
                      ))}
                    </select>
                    <small className="form-text">
                      Hanya menampilkan PDU yang dibuat hari ini (
                      {getTodayDate()})
                    </small>
                  </div>
                )}
              </div>
            </div>

            {/* Section untuk upload dokumen PDU BARU */}
            {addPDU && (
              <div className="form-section">
                <h5 className="section-title">Dokumen PDU Baru</h5>
                <div className="row g-3">
                  <div className="col-12 col-md-6">
                    <label className="form-label">
                      Upload Surat Perintah Operasional
                      <span className="text-danger">*</span>
                    </label>
                    <input
                      className="form-control"
                      type="file"
                      name="buktiSuratPerintahOperasional"
                      onChange={handleFileChange}
                      accept=".pdf,.jpg,.jpeg,.png"
                      required={addPDU}
                    />
                    <small className="form-text">
                      Format: PDF, JPG, JPEG, PNG (Maksimal 10MB)
                    </small>
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">
                      Upload Rundown Acara Harian
                      <span className="text-danger">*</span>
                    </label>
                    <input
                      className="form-control"
                      type="file"
                      name="buktiRondownAcaraHarian"
                      onChange={handleFileChange}
                      accept=".pdf,.jpg,.jpeg,.png"
                      required={addPDU}
                    />
                    <small className="form-text">
                      Format: PDF, JPG, JPEG, PNG (Maksimal 10MB)
                    </small>
                  </div>
                </div>
              </div>
            )}

            {/* Section untuk data ACARA - SELALU TAMPIL */}
            <div className="form-section">
              <h5 className="section-title">Data Acara</h5>
              <div className="row g-3">
                {/* Nama Acara */}
                <div className="col-12 col-md-6">
                  <label className="form-label">
                    Nama Acara<span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Enter nama acara"
                    name="namaAcara"
                    value={formData.namaAcara}
                    onChange={handleInputChange}
                    autocomplete="off"
                    required
                  />
                </div>

                {/* Tipe Acara */}
                <div className="col-12 col-md-6">
                  <label className="form-label">
                    Tipe Acara<span className="text-danger">*</span>
                  </label>
                  <div className="radio-group form-check form-check-inline">
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="radio"
                        name="tipeAcara"
                        value="Live"
                        id="live"
                        checked={formData.tipeAcara === 'Live'}
                        onChange={handleInputChange}
                        required
                      />
                      <label className="form-check-label" htmlFor="live">
                        Live
                      </label>
                    </div>
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="radio"
                        name="tipeAcara"
                        value="Tipping"
                        id="tipping"
                        checked={formData.tipeAcara === 'Tipping'}
                        onChange={handleInputChange}
                      />
                      <label className="form-check-label" htmlFor="tipping">
                        Tipping
                      </label>
                    </div>
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="radio"
                        name="tipeAcara"
                        value="Playback"
                        id="playback"
                        checked={formData.tipeAcara === 'Playback'}
                        onChange={handleInputChange}
                      />
                      <label className="form-check-label" htmlFor="playback">
                        Playback
                      </label>
                    </div>
                  </div>
                </div>

                {/* Kendala */}
                <div className="col-12">
                  <label className="form-label">
                    Apakah ada kendala?<span className="text-danger">*</span>
                  </label>
                  <div className="radio-group form-check form-check-inline">
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="radio"
                        name="kendala"
                        value="false"
                        id="tidakKendala"
                        checked={formData.kendala === false}
                        onChange={handleKendalaChange}
                        required
                      />
                      <label
                        className="form-check-label"
                        htmlFor="tidakKendala"
                      >
                        Tidak
                      </label>
                    </div>
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="radio"
                        name="kendala"
                        value="true"
                        id="adaKendala"
                        checked={formData.kendala === true}
                        onChange={handleKendalaChange}
                      />
                      <label className="form-check-label" htmlFor="adaKendala">
                        Ya
                      </label>
                    </div>
                  </div>
                </div>

                {/* Bukti Dukungan Kendala - Hanya tampil jika kendala = true */}
                {formData.kendala === true && (
                  <div className="col-12 col-md-6">
                    <label className="form-label">
                      Bukti Dukungan Kendala
                      <span className="text-danger">*</span>
                    </label>
                    <input
                      className="form-control"
                      type="file"
                      name="buktiDukung"
                      onChange={handleFileChange}
                      accept=".jpg,.jpeg,.png,.pdf"
                      required={formData.kendala === true}
                    />
                    <small className="form-text">
                      Upload bukti dukungan kendala (wajib) - Format: JPG, JPEG,
                      PNG, PDF (Maksimal 10MB)
                    </small>
                  </div>
                )}

                {/* Keterangan Kendala - Hanya tampil jika kendala = true */}
                {formData.kendala === true && (
                  <div className="col-12">
                    <label className="form-label">
                      Kendala terkait Acara
                      <span className="text-danger">*</span>
                    </label>
                    <textarea
                      className="form-control"
                      rows="3"
                      name="keteranganKendala"
                      value={formData.keteranganKendala}
                      onChange={handleInputChange}
                      placeholder="Jelaskan kendala yang dialami..."
                      required={formData.kendala === true}
                    ></textarea>
                    <small className="form-text">
                      Jelaskan kendala yang dialami (wajib)
                    </small>
                  </div>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div className="form-actions">
              <button
                type="submit"
                className="btn btn-primary btn-submit"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span
                      className="spinner-border spinner-border-sm me-2"
                      role="status"
                    ></span>
                    Loading...
                  </>
                ) : (
                  'Create Data'
                )}
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary btn-cancel"
                onClick={handleCancel}
                disabled={loading}
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateEdit;
