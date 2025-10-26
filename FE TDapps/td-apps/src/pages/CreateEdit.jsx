import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';

const CreateEdit = () => {
  const [addPDU, setAddPDU] = useState(false);
  const [formData, setFormData] = useState({
    namaPDU: '',
    namaAcara: '',
    tipeAcara: '',
    kendala: 'Tidak',
    buktiDukungan: null,
    keteranganKendala: '',
  });

  // Dummy data untuk dropdown PDU
  const [pduList] = useState([{ id: 1, nama: 'PDU A' }]);

  const handleInputChange = (e) => {
    const { name, value, type, files } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'file' ? files[0] : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle form submission logic here
    console.log('Form data:', formData);
  };

  return (
    <div className="container mt-4">
      <form className="formheader" onSubmit={handleSubmit}>
        <h3 className="h3header">Create Data</h3>
        <p className="textformheader">
          If you have any question or issue's to use our product. Fill the form
          below. We'll help you.
        </p>

        <div className="row">
          {/* Nama PDU Section */}
          <div className="mb-3 col-12">
            <div className="d-flex align-items-center gap-3">
              <label className="form-label mb-0 flex-grow-1">
                Nama PDU<span className="text-danger">*</span>
              </label>

              {addPDU ? (
                // Input text ketika addPDU true
                <input
                  type="text"
                  className="form-control"
                  placeholder="Enter name PDU"
                  name="namaPDU"
                  value={formData.namaPDU}
                  onChange={handleInputChange}
                  required
                />
              ) : (
                // Dropdown ketika addPDU false
                <select
                  className="form-select"
                  name="namaPDU"
                  value={formData.namaPDU}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Pilih PDU</option>
                  {pduList.map((pdu) => (
                    <option key={pdu.id} value={pdu.nama}>
                      {pdu.nama}
                    </option>
                  ))}
                </select>
              )}

              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setAddPDU(!addPDU)}
              >
                {addPDU ? '-' : '+'}
              </button>
            </div>
            <small className="text-muted">
              {addPDU ? 'Masukkan nama PDU baru' : 'Pilih PDU yang sudah ada'}
            </small>
          </div>

          {addPDU ? (
            /* Upload Documents Section - untuk PDU baru */
            <>
              <div className="mb-3 col-md-6">
                <label className="form-label">
                  Upload Surat Perintah Operasional
                  <span className="text-danger">*</span>
                </label>
                <input
                  className="form-control"
                  type="file"
                  name="suratOperasional"
                  onChange={handleInputChange}
                  accept=".pdf,.doc,.docx"
                  required
                />
              </div>
              <div className="mb-3 col-md-6">
                <label className="form-label">
                  Upload Rundown Acara Harian
                  <span className="text-danger">*</span>
                </label>
                <input
                  className="form-control"
                  type="file"
                  name="rundownAcara"
                  onChange={handleInputChange}
                  accept=".pdf,.doc,.docx"
                  required
                />
              </div>
            </>
          ) : (
            /* Event Details Section - untuk PDU yang sudah ada */
            <>
              {/* Nama Acara */}
              <div className="mb-3 col-md-6">
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
                  required
                />
              </div>

              {/* Tipe Acara */}
              <div className="mb-3 col-md-6">
                <label className="form-label d-block">
                  Tipe Acara<span className="text-danger">*</span>
                </label>
                <div className="d-flex gap-3">
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="radio"
                      name="tipeAcara"
                      value="internal"
                      id="internal"
                      checked={formData.tipeAcara === 'internal'}
                      onChange={handleInputChange}
                      required
                    />
                    <label className="form-check-label" htmlFor="internal">
                      Internal
                    </label>
                  </div>
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="radio"
                      name="tipeAcara"
                      value="eksternal"
                      id="eksternal"
                      checked={formData.tipeAcara === 'eksternal'}
                      onChange={handleInputChange}
                    />
                    <label className="form-check-label" htmlFor="eksternal">
                      Eksternal
                    </label>
                  </div>
                </div>
              </div>

              {/* Kendala */}
              <div className="mb-3 col-12">
                <label className="form-label">
                  Apakah ada kendala?<span className="text-danger">*</span>
                </label>
                <select
                  className="form-select"
                  name="kendala"
                  value={formData.kendala}
                  onChange={handleInputChange}
                  required
                >
                  <option value="Tidak">Tidak</option>
                  <option value="Ya">Ya</option>
                </select>
              </div>

              {/* Bukti Dukungan Kendala */}
              <div className="mb-3 col-md-6">
                <label className="form-label">
                  Bukti Dukungan Kendala
                  {formData.kendala === 'Ya' && (
                    <span className="text-danger">*</span>
                  )}
                </label>
                <input
                  className="form-control"
                  type="file"
                  name="buktiDukungan"
                  onChange={handleInputChange}
                  disabled={formData.kendala !== 'Ya'}
                  accept=".jpg,.jpeg,.png,.pdf"
                  required={formData.kendala === 'Ya'}
                />
              </div>

              {/* Keterangan Kendala */}
              <div className="mb-3 col-12">
                <label className="form-label">
                  Kendala terkait Acara
                  {formData.kendala === 'Ya' && (
                    <span className="text-danger">*</span>
                  )}
                </label>
                <textarea
                  className="form-control"
                  rows="3"
                  name="keteranganKendala"
                  value={formData.keteranganKendala}
                  onChange={handleInputChange}
                  disabled={formData.kendala !== 'Ya'}
                  placeholder={
                    formData.kendala === 'Ya'
                      ? 'Jelaskan kendala yang dialami...'
                      : 'Tidak ada kendala'
                  }
                  required={formData.kendala === 'Ya'}
                ></textarea>
              </div>
            </>
          )}

          {/* Submit Button */}
          <div className="mb-3 col-12">
            <button type="submit" className="btn btn-success me-2">
              Create
            </button>
            <NavLink to={'/listtd'} className="btn btn-secondary">
              Cancel
            </NavLink>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CreateEdit;
