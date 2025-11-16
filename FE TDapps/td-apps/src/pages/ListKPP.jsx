import React, { useState, useEffect } from 'react';
import '../assets/css/listtd.css';
import { NavLink, useNavigate } from 'react-router-dom';
// import Print from '../assets/print.svg';
import Logout from '../assets/logout.svg';
import '../assets/css/listkpp.css';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PDFDocument } from 'pdf-lib';
import io from 'socket.io-client';

const ListKPP = () => {
  const [pduData, setPduData] = useState([]);
  const [acaraData, setAcaraData] = useState([]);
  const [userDataMap, setUserDataMap] = useState({});
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState('');
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const {
    token,
    user,
    isAuthenticated,
    loading: authLoading,
    logout,
    login,
  } = useAuth();
  const navigate = useNavigate();

  // ===============================
  // SOCKET.IO SETUP YANG DIOPTIMASI
  // ===============================

  useEffect(() => {
    // Early return yang ketat
    if (authLoading || !isAuthenticated || !token) {
      return;
    }

    // CEGAH MULTIPLE CONNECTIONS - ini penyebab utama lemot
    if (socket && (socket.connected || socket.connecting)) {
      console.log('⚡ Socket already active, skipping reconnection');
      return;
    }

    console.log('🔄 Initializing optimized Socket.IO connection...');

    const newSocket = io('http://localhost:3000', {
      auth: { token },
      transports: ['websocket', 'polling'],
      timeout: 5000, // Lebih pendek
      reconnection: true,
      reconnectionAttempts: 2, // Kurangi attempts
      reconnectionDelay: 2000,
      reconnectionDelayMax: 5000,
      autoConnect: true,
      forceNew: false, // PENTING: reuse connection
      multiplex: true,
      closeOnBeforeunload: true, // Biarkan browser handle
    });

    setSocket(newSocket);

    // DEBOUNCE UTILITY - tambahkan di sini
    const debounce = (func, wait) => {
      let timeout;
      return function executedFunction(...args) {
        const later = () => {
          clearTimeout(timeout);
          func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
      };
    };

    // DEBOUNCED HANDLERS untuk prevent terlalu banyak updates
    const debouncedPduUpdate = debounce((data) => {
      console.log('🔄 Real-time PDU update (debounced)');
      handleRealTimeUpdate(data);
    }, 1000); // 1 second debounce

    const debouncedAcaraUpdate = debounce((data) => {
      console.log('🔄 Real-time Acara update (debounced)');
      handleRealTimeAcaraUpdate(data);
    }, 1000);

    // SIMPLE EVENT HANDLERS
    const handleConnect = () => {
      console.log('✅ Socket.IO connected');
      setIsConnected(true);
    };

    const handleDisconnect = (reason) => {
      console.log('❌ Socket.IO disconnected:', reason);
      setIsConnected(false);
    };

    const handleConnectError = (error) => {
      console.error('❌ Socket.IO connection error:', error.message);
      setIsConnected(false);
    };

    const handleDataRefreshed = (data) => {
      console.log('🔄 Manual refresh via socket');
      // Batch updates dengan setTimeout
      setTimeout(() => {
        setPduData((prev) => data.pduData || prev);
        setAcaraData((prev) => data.acaraData || prev);
        setDataLoading(false);
      }, 0);
    };

    // ATTACH EVENT LISTENERS
    newSocket.on('connect', handleConnect);
    newSocket.on('disconnect', handleDisconnect);
    newSocket.on('connect_error', handleConnectError);
    newSocket.on('pduUpdated', debouncedPduUpdate);
    newSocket.on('acaraUpdated', debouncedAcaraUpdate);
    newSocket.on('dataRefreshed', handleDataRefreshed);

    // CLEANUP FUNCTION YANG EFEKTIF
    return () => {
      console.log('🧹 Cleaning up Socket.IO connection');

      if (newSocket) {
        // Remove listeners secara eksplisit
        newSocket.off('connect', handleConnect);
        newSocket.off('disconnect', handleDisconnect);
        newSocket.off('connect_error', handleConnectError);
        newSocket.off('pduUpdated', debouncedPduUpdate);
        newSocket.off('acaraUpdated', debouncedAcaraUpdate);
        newSocket.off('dataRefreshed', handleDataRefreshed);

        // Disconnect hanya jika masih connected
        if (newSocket.connected) {
          newSocket.disconnect();
        }
      }
    };
  }, [authLoading, isAuthenticated, token]);

  // ===============================
  // TOKEN MANAGEMENT & REFRESH SYSTEM
  // ===============================

  /**
   * Fungsi refresh token yang PROAKTIF
   */
  const refreshAuthToken = async () => {
    try {
      // console.log('🔄 Attempting to refresh token...');

      const response = await axios.get('http://localhost:3000/token', {
        withCredentials: true, // ✅ mengirim refresh token dari cookies
      });

      if (response.data.accessToken) {
        console.log('✅ Token refreshed successfully');

        // Decode token baru untuk mendapatkan user data
        const payload = JSON.parse(
          atob(response.data.accessToken.split('.')[1])
        );

        const userData = {
          userId: payload.userId,
          name: payload.name,
          username: payload.username,
          role: payload.role,
        };

        // ✅ Update token dan user data di context/auth
        login(response.data.accessToken, userData, true);
        return response.data.accessToken;
      }
    } catch (error) {
      console.error('❌ Token refresh failed:', error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.log('🛑 Refresh token expired, logging out...');
        logout();
        navigate('/login');
      }
      return null;
    }
  };

  /**
   * Cek apakah token akan segera expired
   */
  const isTokenExpiringSoon = (token) => {
    if (!token) return true;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expTime = payload.exp * 1000; // Convert to milliseconds
      const currentTime = Date.now();
      const bufferTime = 5 * 60 * 1000; // 5 minutes buffer

      return expTime - currentTime < bufferTime;
    } catch (error) {
      console.error('Error checking token expiry:', error);
      return true;
    }
  };

  /**
   * Setup proactive token refresh system
   */
  useEffect(() => {
    if (!isAuthenticated || !token) return;

    const checkTokenExpiry = async () => {
      if (isTokenExpiringSoon(token)) {
        console.log('🔄 Token hampir expired, refreshing proactively...');
        await refreshAuthToken();
      }
    };

    // Check token expiry setiap 1 menit
    const tokenCheckInterval = setInterval(checkTokenExpiry, 60000);

    // Check immediately on mount
    checkTokenExpiry();

    return () => clearInterval(tokenCheckInterval);
  }, [token, isAuthenticated]);

  // ===============================
  // AXIOS INTERCEPTORS DENGAN REFRESH TOKEN
  // ===============================

  useEffect(() => {
    const requestInterceptor = axios.interceptors.request.use(
      async (config) => {
        // ✅ Proactive token refresh sebelum request jika token hampir expired
        if (token && isTokenExpiringSoon(token)) {
          // console.log('🔄 Token expiring soon, refreshing before request...');
          const newToken = await refreshAuthToken();
          if (newToken) {
            config.headers.Authorization = `Bearer ${newToken}`;
          }
        } else if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    const responseInterceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // ✅ Handle token expired (401)
        if (error.response?.status === 401 && !originalRequest._retry) {
          console.log('🔐 Token expired, refreshing...');
          originalRequest._retry = true;

          const newToken = await refreshAuthToken();
          if (newToken) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return axios(originalRequest);
          } else {
            logout();
            navigate('/login');
            return Promise.reject(error);
          }
        }

        // ✅ Handle access forbidden (403) - mungkin token invalid
        if (error.response?.status === 403 && !originalRequest._retry) {
          console.log('🔐 Access forbidden, refreshing token...');
          originalRequest._retry = true;

          const newToken = await refreshAuthToken();
          if (newToken) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return axios(originalRequest);
          }
        }

        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.request.eject(requestInterceptor);
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, [token, login, logout, navigate]);

  // ===============================
  // HANDLER REAL-TIME UPDATES
  // ===============================

  const handleRealTimeUpdate = (updatedData) => {
    setPduData((prevData) => {
      // Cek apakah data sudah ada
      const existingIndex = prevData.findIndex(
        (item) => item.id === updatedData.id
      );

      if (existingIndex >= 0) {
        // Update data yang sudah ada
        const newData = [...prevData];
        newData[existingIndex] = { ...newData[existingIndex], ...updatedData };
        return newData;
      } else {
        // Tambah data baru
        return [updatedData, ...prevData];
      }
    });

    // Show notification atau update UI lainnya
    showNotification(`Data PDU "${updatedData.namePDU}" diperbarui`);
  };

  const handleRealTimeAcaraUpdate = (updatedData) => {
    setAcaraData((prevData) => {
      const existingIndex = prevData.findIndex(
        (item) => item.id === updatedData.id
      );

      if (existingIndex >= 0) {
        const newData = [...prevData];
        newData[existingIndex] = { ...newData[existingIndex], ...updatedData };
        return newData;
      } else {
        return [updatedData, ...prevData];
      }
    });

    showNotification(`Data Acara "${updatedData.namaAcara}" diperbarui`);
  };

  const showNotification = (message) => {
    // Anda bisa menggunakan toast library atau custom notification
    console.log('💫 Notification:', message);

    // Contoh simple alert - bisa diganti dengan toast yang lebih elegant
    if (window.showNotification) {
      window.showNotification(message);
    } else {
      // Fallback ke console log
      console.log('💫', message);
    }
  };

  // ===============================
  // FUNGSI FETCH DATA
  // ===============================

  const fetchAcaraData = async (currentToken = token) => {
    try {
      const response = await axios.get('http://localhost:3000/admin/acara', {
        headers: {
          Authorization: `Bearer ${currentToken}`,
        },
      });
      return response.data.data || response.data;
    } catch (error) {
      console.error('Error fetching acara data:', error);
      if (error.response?.status === 401) {
        const newToken = await refreshAuthToken();
        if (newToken) {
          return fetchAcaraData(newToken);
        }
      }
      return [];
    }
  };

  const fetchAllUsers = async (currentToken = token) => {
    try {
      const response = await axios.get('http://localhost:3000/users', {
        headers: {
          Authorization: `Bearer ${currentToken}`,
        },
      });

      const userMap = {};
      response.data.data.forEach((user) => {
        userMap[user.id] = user;
      });
      setUserDataMap(userMap);
    } catch (error) {
      console.error('Error fetching users:', error);
      if (error.response?.status === 401) {
        const newToken = await refreshAuthToken();
        if (newToken) {
          return fetchAllUsers(newToken);
        }
      }
    }
  };

  const fetchPDUData = async (retryCount = 0) => {
    try {
      setDataLoading(true);
      setError('');

      if (!user || !token) {
        setError('User data tidak tersedia');
        setDataLoading(false);
        return;
      }

      const endpoint =
        user.role === 'admin'
          ? 'http://localhost:3000/pduadmin'
          : 'http://localhost:3000/pdustaff';

      const [pduResponse, acaraData] = await Promise.all([
        axios.get(endpoint, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          timeout: 10000,
        }),
        fetchAcaraData(),
      ]);

      let data = [];
      if (pduResponse.data && pduResponse.data.data) {
        data = pduResponse.data.data;
      } else if (Array.isArray(pduResponse.data)) {
        data = pduResponse.data;
      }

      setPduData(data);
      setAcaraData(acaraData);

      const userIds = [
        ...new Set(data.map((pdu) => pdu.userId).filter(Boolean)),
      ];

      if (userIds.length > 0) {
        await fetchAllUsers();
      }
    } catch (error) {
      console.error('❌ Fetch error:', error.response?.data || error.message);

      if (error.response?.status === 401 && retryCount < 1) {
        console.log('🔄 Retrying fetch with new token...');
        setTimeout(() => fetchPDUData(retryCount + 1), 1000);
        return;
      }

      if (error.response?.status === 401) {
        setError('Session expired. Silakan login kembali.');
        setTimeout(() => {
          logout();
          navigate('/login');
        }, 2000);
      } else {
        setError(error.response?.data?.message || 'Gagal mengambil data');
      }
    } finally {
      setDataLoading(false);
    }
  };

  // ===============================
  // FUNGSI BANTUAN DATA BERSIH (TETAP SAMA)
  // ===============================

  const getCleanPDUData = (pdu) => {
    const cleanPDU = { ...pdu };
    delete cleanPDU.fileContent;
    delete cleanPDU.pdfData;
    delete cleanPDU.content;
    return cleanPDU;
  };

  const getCleanAcaraData = (acara) => {
    const cleanAcara = { ...acara };
    delete cleanAcara.fileContent;
    delete cleanAcara.pdfData;
    delete cleanAcara.content;
    return cleanAcara;
  };

  // ===============================
  // FUNGSI HELPER LAYOUT - DIPERBAIKI (TETAP SAMA)
  // ===============================

  /**
   * Fungsi helper untuk membuat header yang konsisten
   */
  const addStandardHeader = (doc, title, subtitle = null) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    let currentY = 20;

    doc.setFontSize(16);
    doc.setTextColor(40, 40, 40);
    doc.text('LAPORAN HARIAN TECHNICAL DIRECTION', pageWidth / 2, currentY, {
      align: 'center',
    });
    currentY += 8;

    if (subtitle) {
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text(subtitle, pageWidth / 2, currentY, {
        align: 'center',
      });
      currentY += 10;
    } else {
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text(title, pageWidth / 2, currentY, {
        align: 'center',
      });
      currentY += 10;
    }

    return currentY;
  };

  /**
   * Fungsi helper untuk membuat footer yang konsisten - DIPERBAIKI
   */
  const addStandardFooter = (doc, pageNumber, totalPages = null) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);

    const footerText = totalPages
      ? `Halaman ${pageNumber} dari ${totalPages} - TVRI SUMUT - Dicetak oleh: ${
          user?.name || 'N/A'
        }`
      : `Halaman ${pageNumber} - TVRI SUMUT - Dicetak oleh: ${
          user?.name || 'N/A'
        }`;

    doc.text(footerText, pageWidth / 2, pageHeight - 15, {
      align: 'center',
    });
  };

  // ===============================
  // FUNGSI UTAMA PRINT DENGAN EMBED PDF - DIPERBAIKI (TETAP SAMA)
  // ===============================

  /**
   * Generate PDF data PDU dan acara (HALAMAN 1) - DIPERBAIKI
   */
  const generateDataPDF = (pdu) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // ===============================
    // HALAMAN 1: HEADER
    // ===============================
    let currentY = addStandardHeader(
      doc,
      'DETAIL DATA PDU DAN ACARA',
      'TVRI SUMUT - Bidang Teknik'
    );

    // ===============================
    // INFORMASI PDU
    // ===============================
    const pduDataDetail = [
      ['Technical Director', getTDName(pdu) || 'N/A'],
      ['Nama PDU', pdu.namePDU || 'N/A'],
      [
        'Tanggal',
        pdu.createdAt
          ? new Date(pdu.createdAt).toLocaleDateString('id-ID')
          : 'N/A',
      ],
      ['Dibuat Oleh', user?.name || 'N/A'],
    ];

    autoTable(doc, {
      startY: currentY,
      head: [['Informasi PDU', '']],
      body: pduDataDetail,
      theme: 'grid',
      styles: {
        fontSize: 10,
        cellPadding: 5,
        textColor: [0, 0, 0],
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: [70, 130, 180],
        textColor: 255,
        fontStyle: 'bold',
        halign: 'center',
      },
      bodyStyles: {
        fillColor: [255, 255, 255],
      },
      columnStyles: {
        0: {
          fontStyle: 'bold',
          fillColor: [240, 240, 240],
          cellWidth: 55, // Diperkecil sedikit
        },
        1: {
          cellWidth: 125, // Disesuaikan
          fillColor: [255, 255, 255],
        },
      },
      margin: { top: currentY, right: 14, bottom: 10, left: 14 },
      tableWidth: 'wrap',
    });

    currentY = doc.lastAutoTable.finalY + 15;

    // ===============================
    // DAFTAR ACARA
    // ===============================
    const acaraForThisPDU = getAcaraByPDUId(pdu.id);

    if (acaraForThisPDU.length > 0) {
      // Header Acara
      doc.setFontSize(12);
      doc.setTextColor(0, 100, 0);
      doc.text(`Daftar Acara (${acaraForThisPDU.length} acara):`, 14, currentY);
      currentY += 10;

      // Tabel Acara dengan kolom yang disesuaikan
      const acaraTableData = acaraForThisPDU.map((acara, index) => [
        index + 1,
        acara.namaAcara || 'N/A',
        acara.tipeAcara || 'N/A',
        acara.kendala || 'N/A',
        acara.keteranganKendala || '-',
      ]);

      autoTable(doc, {
        startY: currentY,
        head: [['No', 'Nama Acara', 'Tipe Acara', 'Kendala', 'Keterangan']],
        body: acaraTableData,
        theme: 'grid',
        styles: {
          fontSize: 7, // Diperkecil
          cellPadding: 3,
          textColor: [0, 0, 0],
          lineWidth: 0.1,
        },
        headStyles: {
          fillColor: [34, 139, 34],
          textColor: 255,
          fontStyle: 'bold',
          halign: 'center',
          fontSize: 8,
        },
        bodyStyles: {
          fillColor: [255, 255, 255],
        },
        alternateRowStyles: {
          fillColor: [245, 255, 245],
        },
        columnStyles: {
          0: {
            cellWidth: 10,
            halign: 'center',
          },
          1: {
            cellWidth: 45,
            halign: 'left',
          },
          2: {
            cellWidth: 25,
            halign: 'center',
          },
          3: {
            cellWidth: 22,
            halign: 'center',
          },
          4: {
            cellWidth: 58,
            halign: 'left',
          },
        },
        margin: { top: currentY, right: 14, bottom: 10, left: 14 },
        tableWidth: 'wrap',
      });

      currentY = doc.lastAutoTable.finalY + 10;
    } else {
      doc.setFontSize(10);
      doc.setTextColor(150, 150, 150);
      doc.text('Tidak ada acara tercatat untuk PDU ini.', 14, currentY);
      currentY += 10;
    }

    console.log('✅ Halaman 1: Data PDU & Acara berhasil dibuat');
    return doc;
  };

  /**
   * Konversi array buffer ke base64
   */
  const arrayBufferToBase64 = (buffer) => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  /**
   * Fungsi untuk download file dengan error handling yang better
   */
  /**
   * Fungsi untuk download file dengan validasi tipe file
   */
  const downloadFile = async (fileUrl, expectedType = null) => {
    try {
      console.log(`📥 Downloading file: ${fileUrl}`);

      const response = await axios.get(fileUrl, {
        responseType: 'arraybuffer',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        timeout: 30000,
        validateStatus: function (status) {
          return status >= 200 && status < 300;
        },
      });

      // Validasi response data
      if (!response.data || response.data.byteLength === 0) {
        throw new Error('File kosong atau tidak tersedia');
      }

      console.log(
        `✅ File downloaded successfully: ${response.data.byteLength} bytes`
      );
      return response.data;
    } catch (error) {
      console.error(`❌ Failed to download file: ${fileUrl}`, error);
      throw new Error(`Gagal mengunduh file: ${error.message}`);
    }
  };

  /**
   * Render PDF page sebagai gambar sederhana dengan layout yang baik
   */
  /**
   * Render PDF page sebagai gambar dengan error handling yang better
   */
  const renderPDFPageAsSimpleImage = async (doc, pdfDoc, pageNum, startY) => {
    try {
      console.log(`🖼️ Rendering PDF page ${pageNum + 1}`);

      // Validasi pdfDoc
      if (!pdfDoc || typeof pdfDoc.getPageCount !== 'function') {
        throw new Error('PDF document tidak valid');
      }

      // Buat PDF sementara dengan hanya 1 halaman
      const tempPdf = await PDFDocument.create();

      try {
        const [copiedPage] = await tempPdf.copyPages(pdfDoc, [pageNum]);
        tempPdf.addPage(copiedPage);
      } catch (copyError) {
        console.error('❌ Error copying PDF page:', copyError);
        throw new Error('Tidak dapat memproses halaman PDF');
      }

      // Convert ke base64
      const tempPdfBytes = await tempPdf.save();

      // Validasi PDF bytes
      if (!tempPdfBytes || tempPdfBytes.length < 100) {
        throw new Error('PDF hasil konversi tidak valid');
      }

      const base64 = arrayBufferToBase64(tempPdfBytes);
      const pdfDataUrl = `data:application/pdf;base64,${base64}`;

      // Gunakan PDF.js untuk render dengan timeout
      const loadingTask = window.pdfjsLib.getDocument(pdfDataUrl);

      const pdf = await Promise.race([
        loadingTask.promise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('PDF loading timeout')), 10000)
        ),
      ]);

      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 1.3 });

      // Buat canvas
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      // Render ke canvas dengan timeout
      await Promise.race([
        page.render({
          canvasContext: context,
          viewport: viewport,
        }).promise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('PDF rendering timeout')), 15000)
        ),
      ]);

      // Convert ke image
      const imgData = canvas.toDataURL('image/jpeg', 0.8);

      // Hitung dimensi untuk fit di PDF
      const maxWidth = 170;
      const maxHeight = 180;
      let width = canvas.width;
      let height = canvas.height;

      if (width > maxWidth) {
        const ratio = maxWidth / width;
        width = maxWidth;
        height = height * ratio;
      }

      if (height > maxHeight) {
        const ratio = maxHeight / height;
        height = maxHeight;
        width = width * ratio;
      }

      // Center the image
      const x = (210 - width) / 2;
      const y = startY + 5;

      doc.addImage(imgData, 'JPEG', x, y, width, height);

      console.log(`✅ Successfully rendered PDF page ${pageNum + 1}`);
      return true;
    } catch (error) {
      console.error(`❌ Error rendering PDF page ${pageNum + 1}:`, error);

      // Fallback yang lebih informatif
      const boxStartY = startY + 10;

      doc.setFillColor(250, 250, 250);
      doc.rect(20, boxStartY, 170, 120, 'F');
      doc.setDrawColor(200, 200, 200);
      doc.rect(20, boxStartY, 170, 120);

      doc.setFontSize(16);
      doc.setTextColor(200, 200, 200);
      doc.text('📄', 105, boxStartY + 40, { align: 'center' });

      doc.setFontSize(10);
      doc.setTextColor(150, 150, 150);
      doc.text('Konten PDF Tidak Dapat Dimuat', 105, boxStartY + 60, {
        align: 'center',
      });

      doc.setFontSize(8);
      doc.text(
        'File mungkin korup atau format tidak didukung',
        105,
        boxStartY + 70,
        {
          align: 'center',
        }
      );

      doc.text(`Error: ${error.message}`, 105, boxStartY + 80, {
        align: 'center',
      });

      return false;
    }
  };

  /**
   * Tambahkan gambar sebagai halaman - DIPERBAIKI (TANPA FOOTER)
   */
  const addImageAsPage = async (
    doc,
    imageUrl,
    label,
    pageWidth,
    pageHeight
  ) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';

      img.onload = () => {
        try {
          doc.addPage();
          const currentPage = doc.internal.getNumberOfPages();

          // Header dengan spacing yang baik
          let currentY = addStandardHeader(doc, label);

          // Hitung dimensi gambar dengan margin yang aman
          const maxWidth = 170;
          const maxHeight = 180;
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            const ratio = maxWidth / width;
            width = maxWidth;
            height = height * ratio;
          }

          if (height > maxHeight) {
            const ratio = maxHeight / height;
            height = maxHeight;
            width = width * ratio;
          }

          // Center the image dengan posisi yang tepat
          const x = (210 - width) / 2;
          const y = currentY + 10;

          doc.addImage(img, 'JPEG', x, y, width, height);

          resolve(true);
        } catch (error) {
          console.error('Error adding image page:', error);
          resolve(false);
        }
      };

      img.onerror = () => {
        console.error('Error loading image:', imageUrl);
        addFileInfoPage(
          doc,
          label,
          'Gambar tidak dapat dimuat',
          'Image',
          pageWidth,
          pageHeight
        );
        resolve(false);
      };

      img.src = imageUrl;
    });
  };

  /**
   * Tambahkan gambar sebagai halaman dengan informasi acara - DIPERBAIKI (TANPA FOOTER)
   */
  const addImageAsPageWithAcaraInfo = async (
    doc,
    imageUrl,
    label,
    acaraInfo,
    pageWidth,
    pageHeight
  ) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';

      img.onload = () => {
        try {
          doc.addPage();
          const currentPage = doc.internal.getNumberOfPages();

          // HEADER dengan spacing yang baik
          let currentY = addStandardHeader(doc, label);

          // INFORMASI ACARA dengan layout yang rapi
          doc.setFontSize(10);
          doc.setTextColor(0, 0, 0);

          // Background untuk info acara
          doc.setFillColor(245, 245, 245);
          doc.rect(14, currentY, 182, 28, 'F');
          doc.setDrawColor(200, 200, 200);
          doc.rect(14, currentY, 182, 28);

          doc.text(`Acara: ${acaraInfo.namaAcara || 'N/A'}`, 20, currentY + 7);
          doc.text(`Tipe: ${acaraInfo.tipeAcara || 'N/A'}`, 20, currentY + 15);
          doc.text(
            `Waktu: ${formatTime(acaraInfo.tanggalAcara)}`,
            110,
            currentY + 7
          );
          doc.text(
            `Kendala: ${acaraInfo.kendala || 'N/A'}`,
            110,
            currentY + 15
          );

          currentY += 35;

          // Hitung dimensi gambar dengan margin yang aman
          const maxWidth = 170;
          const maxHeight = 160;
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            const ratio = maxWidth / width;
            width = maxWidth;
            height = height * ratio;
          }

          if (height > maxHeight) {
            const ratio = maxHeight / height;
            height = maxHeight;
            width = width * ratio;
          }

          // Center the image dengan posisi yang tepat
          const x = (210 - width) / 2;
          const y = currentY;

          doc.addImage(img, 'JPEG', x, y, width, height);

          resolve(true);
        } catch (error) {
          console.error('Error adding image page with acara info:', error);
          resolve(false);
        }
      };

      img.onerror = () => {
        console.error('Error loading image:', imageUrl);
        addFileInfoPageWithAcaraInfo(
          doc,
          label,
          'Gambar tidak dapat dimuat',
          'Image',
          acaraInfo,
          pageWidth,
          pageHeight
        );
        resolve(false);
      };

      img.src = imageUrl;
    });
  };

  /**
   * Tambahkan halaman informasi file dengan info acara - DIPERBAIKI (TANPA FOOTER)
   */
  const addFileInfoPageWithAcaraInfo = (
    doc,
    label,
    filename,
    fileType,
    acaraInfo,
    pageWidth,
    pageHeight
  ) => {
    doc.addPage();
    const currentPage = doc.internal.getNumberOfPages();

    // Header
    let currentY = addStandardHeader(doc, label);

    // Info acara
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);

    // Background untuk info acara
    doc.setFillColor(245, 245, 245);
    doc.rect(14, currentY, 182, 28, 'F');
    doc.setDrawColor(200, 200, 200);
    doc.rect(14, currentY, 182, 28);

    doc.text(`Acara: ${acaraInfo.namaAcara || 'N/A'}`, 20, currentY + 7);
    doc.text(`Tipe: ${acaraInfo.tipeAcara || 'N/A'}`, 20, currentY + 15);
    doc.text(`Waktu: ${formatTime(acaraInfo.tanggalAcara)}`, 110, currentY + 7);
    doc.text(`Kendala: ${acaraInfo.kendala || 'N/A'}`, 110, currentY + 15);

    currentY += 35;

    // Box informasi file
    doc.setFillColor(240, 248, 255);
    doc.rect(14, currentY, 182, 50, 'F');
    doc.setDrawColor(100, 149, 237);
    doc.rect(14, currentY, 182, 50);

    // Icon dan judul
    doc.setTextColor(0, 0, 139);
    doc.setFontSize(12);
    doc.text('📄 FILE TERLAMPIR', pageWidth / 2, currentY + 10, {
      align: 'center',
    });

    // Informasi file
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.text(`Nama File: ${filename || 'N/A'}`, 20, currentY + 22);
    doc.text(`Tipe: ${fileType}`, 20, currentY + 30);
    doc.text(`Status: File tersedia di sistem`, 20, currentY + 38);
  };

  /**
   * Tambahkan halaman informasi file (untuk fallback) - DIPERBAIKI (TANPA FOOTER)
   */
  const addFileInfoPage = (
    doc,
    label,
    filename,
    fileType,
    pageWidth,
    pageHeight
  ) => {
    doc.addPage();
    const currentPage = doc.internal.getNumberOfPages();

    // Header
    let currentY = addStandardHeader(doc, label);

    // Box informasi file
    doc.setFillColor(240, 248, 255);
    doc.rect(14, currentY, 182, 50, 'F');
    doc.setDrawColor(100, 149, 237);
    doc.rect(14, currentY, 182, 50);

    // Icon dan judul
    doc.setTextColor(0, 0, 139);
    doc.setFontSize(12);
    doc.text('📄 FILE TERLAMPIR', pageWidth / 2, currentY + 10, {
      align: 'center',
    });

    // Informasi file
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.text(`Nama File: ${filename || 'N/A'}`, 20, currentY + 22);
    doc.text(`Tipe: ${fileType}`, 20, currentY + 30);
    doc.text(`Status: File tersedia di sistem`, 20, currentY + 38);
  };

  /**
   * Tambahkan halaman kosong dengan info acara - DIPERBAIKI (TANPA FOOTER)
   */
  const addEmptyDocumentPageWithAcaraInfo = (
    doc,
    title,
    message,
    acaraInfo
  ) => {
    try {
      doc.addPage();
      const currentPage = doc.internal.getNumberOfPages();
      const pageWidth = doc.internal.pageSize.getWidth();

      // Header
      let currentY = addStandardHeader(doc, title);

      // Info acara
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);

      // Background untuk info acara
      doc.setFillColor(245, 245, 245);
      doc.rect(14, currentY, 182, 28, 'F');
      doc.setDrawColor(200, 200, 200);
      doc.rect(14, currentY, 182, 28);

      doc.text(`Acara: ${acaraInfo.namaAcara || 'N/A'}`, 20, currentY + 7);
      doc.text(`Tipe: ${acaraInfo.tipeAcara || 'N/A'}`, 20, currentY + 15);
      doc.text(
        `Waktu: ${formatTime(acaraInfo.tanggalAcara)}`,
        110,
        currentY + 7
      );
      doc.text(`Kendala: ${acaraInfo.kendala || 'N/A'}`, 110, currentY + 15);

      currentY += 35;

      // Konten pesan
      doc.setFontSize(14);
      doc.setTextColor(150, 150, 150);
      doc.text('📭', pageWidth / 2, currentY + 30, { align: 'center' });

      doc.setFontSize(11);
      doc.setTextColor(100, 100, 100);
      doc.text(message, pageWidth / 2, currentY + 45, {
        align: 'center',
        maxWidth: 180,
      });
    } catch (error) {
      console.error('❌ Error adding empty page with acara info:', error);
    }
  };

  /**
   * Tambahkan halaman kosong dengan pesan - DIPERBAIKI (TANPA FOOTER)
   */
  const addEmptyDocumentPage = (doc, title, message) => {
    try {
      doc.addPage();
      const currentPage = doc.internal.getNumberOfPages();
      const pageWidth = doc.internal.pageSize.getWidth();

      // Header
      let currentY = addStandardHeader(doc, title);

      // Konten pesan
      doc.setFontSize(14);
      doc.setTextColor(150, 150, 150);
      doc.text('📭', pageWidth / 2, currentY + 30, { align: 'center' });

      doc.setFontSize(11);
      doc.setTextColor(100, 100, 100);
      doc.text(message, pageWidth / 2, currentY + 45, {
        align: 'center',
        maxWidth: 180,
      });
    } catch (error) {
      console.error('❌ Error adding empty page:', error);
    }
  };

  // ===============================
  // FUNGSI BANTUAN LAINNYA (TETAP SAMA)
  // ===============================

  const getAcaraByPDUId = (pduId) => {
    if (!acaraData.length) {
      console.log('ℹ️ No acara data available');
      return [];
    }

    const filteredAcara = acaraData.filter((acara) => {
      const match = acara.idPDU === pduId;
      return match;
    });

    // console.log(`📊 Total acara for PDU ${pduId}: ${filteredAcara.length}`);

    return filteredAcara
      .map((acara) => getCleanAcaraData(acara))
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  };

  const formatTime = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Format waktu invalid';
      return date.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      return 'Format waktu invalid';
    }
  };

  const getFileUrlAndType = (filename, type) => {
    if (!filename) {
      console.log('❌ No filename provided for type:', type);
      return null;
    }

    filename = filename.toString().trim();

    // Cek jika file invalid
    if (
      filename === 'null' ||
      filename === 'undefined' ||
      filename === 'false'
    ) {
      console.log('❌ Invalid filename detected:', filename);
      return null;
    }

    if (filename.startsWith('http')) {
      console.log('📁 File sudah full URL:', filename);

      // Extract extension dari URL dengan lebih akurat
      const urlObj = new URL(filename);
      const pathname = urlObj.pathname;
      const extension = pathname.split('.').pop().toLowerCase();

      // Deteksi tipe file berdasarkan extension
      const imageExtensions = [
        'jpg',
        'jpeg',
        'png',
        'gif',
        'bmp',
        'webp',
        'svg',
      ];
      const pdfExtensions = ['pdf'];

      const fileType = imageExtensions.includes(extension)
        ? 'image'
        : pdfExtensions.includes(extension)
        ? 'pdf'
        : 'unknown';

      console.log(
        `🔍 Detected file type: ${fileType} from extension: ${extension}`
      );

      return { url: filename, fileType, filename, extension };
    }

    const baseUrl = 'http://localhost:3000/uploads';
    const folders = {
      surat: 'bukti_surat',
      rondown: 'bukti_rondown',
      dukung: 'bukti_dukung',
    };

    const folder = folders[type];
    if (!folder) {
      console.log('❌ Invalid file type:', type);
      return null;
    }

    const encodedFilename = encodeURIComponent(filename);
    const url = `${baseUrl}/${folder}/${encodedFilename}`;

    // Deteksi extension dari filename dengan lebih akurat
    const extension = filename.split('.').pop().toLowerCase();

    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];
    const pdfExtensions = ['pdf'];

    const fileType = imageExtensions.includes(extension)
      ? 'image'
      : pdfExtensions.includes(extension)
      ? 'pdf'
      : 'unknown';

    console.log(
      `📁 File info - Type: ${type}, Filename: ${filename}, Extension: ${extension}, URL: ${url}, FileType: ${fileType}`
    );

    return { url, fileType, filename, extension };
  };

  const getTDName = (pdu) => {
    if (!pdu.userId) return 'N/A';
    const userData = userDataMap[pdu.userId];
    return userData ? userData.name : 'Loading...';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Tanggal tidak tersedia';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Format tanggal invalid';
      return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch (error) {
      return 'Format tanggal invalid';
    }
  };

  const getAvailableFiles = (pdu) => {
    const files = [];

    if (pdu.buktiSuratPerintahOperasional) {
      files.push('Surat Perintah');
    }

    if (pdu.buktiRondownAcaraHarian) {
      files.push('Rundown');
    }

    const acaraForPDU = getAcaraByPDUId(pdu.id);
    const acaraWithFiles = acaraForPDU.filter(
      (acara) => acara.kendala === 'Ada Kendala' && acara.buktiDukung
    );

    acaraWithFiles.forEach((acara) => {
      files.push(`Dukung: ${acara.namaAcara}`);
    });

    return files;
  };

  // ===============================
  // FUNGSI UTAMA PRINT YANG SUDAH DIPERBAIKI - FOOTER TERPUSAT (TETAP SAMA)
  // ===============================

  const printSinglePDUWithMerge = async (pdu) => {
    try {
      console.log(`🔄 Starting PDF generation for PDU: ${pdu.namePDU}`);

      // STEP 1: BUAT DOKUMEN UTAMA DAN HALAMAN 1
      console.log('🎯 ===== HALAMAN 1: DATA PDU & ACARA =====');
      const mainPDF = generateDataPDF(pdu);
      const pageWidth = mainPDF.internal.pageSize.getWidth();
      const pageHeight = mainPDF.internal.pageSize.getHeight();

      const acaraForPDU = getAcaraByPDUId(pdu.id);
      const acaraWithKendala = acaraForPDU.filter(
        (acara) => acara.kendala === 'Ada Kendala' && acara.buktiDukung
      );

      // STEP 2: HALAMAN 2 - BUKTI SURAT PERINTAH OPERASIONAL
      console.log('🎯 ===== HALAMAN 2: BUKTI SURAT PERINTAH OPERASIONAL =====');
      const fileForSurat = pdu.buktiSuratPerintahOperasional;
      console.log('   📁 Using file for Surat:', fileForSurat);

      if (
        fileForSurat &&
        fileForSurat !== 'null' &&
        fileForSurat !== 'undefined'
      ) {
        const fileInfo = getFileUrlAndType(fileForSurat, 'surat');

        if (fileInfo && fileInfo.url) {
          console.log(`   🔍 File type detected: ${fileInfo.fileType}`);

          if (fileInfo.fileType === 'image') {
            console.log('   🖼️ Embedding image file...');
            await addImageAsPage(
              mainPDF,
              fileInfo.url,
              'Bukti Surat Perintah Operasional',
              pageWidth,
              pageHeight
            );
          } else if (fileInfo.fileType === 'pdf') {
            console.log('   📑 Embedding PDF file...');
            try {
              const pdfBytes = await downloadFile(fileInfo.url);
              const pdfDoc = await PDFDocument.load(pdfBytes);
              const pageCount = pdfDoc.getPageCount();
              console.log(`   📑 PDF has ${pageCount} pages`);

              for (let pageNum = 0; pageNum < pageCount; pageNum++) {
                mainPDF.addPage();
                const currentPage = mainPDF.internal.getNumberOfPages();

                let currentY = addStandardHeader(
                  mainPDF,
                  'Bukti Surat Perintah Operasional',
                  pageCount > 1 ? `Halaman ${pageNum + 1}/${pageCount}` : null
                );

                await renderPDFPageAsSimpleImage(
                  mainPDF,
                  pdfDoc,
                  pageNum,
                  currentY
                );
              }
              console.log('   ✅ Successfully embedded PDF pages');
            } catch (embedError) {
              console.error(
                '   ❌ Failed to embed PDF, using fallback:',
                embedError
              );
              addFileInfoPage(
                mainPDF,
                'Bukti Surat Perintah Operasional',
                fileForSurat,
                'PDF Document',
                pageWidth,
                pageHeight
              );
            }
          } else {
            console.log('   ❓ Unknown file type, using fallback');
            addFileInfoPage(
              mainPDF,
              'Bukti Surat Perintah Operasional',
              fileForSurat,
              'File',
              pageWidth,
              pageHeight
            );
          }
        } else {
          addFileInfoPage(
            mainPDF,
            'Bukti Surat Perintah Operasional',
            fileForSurat,
            'File',
            pageWidth,
            pageHeight
          );
        }
      } else {
        addEmptyDocumentPage(
          mainPDF,
          'Bukti Surat Perintah Operasional',
          'Tidak ada bukti surat perintah operasional'
        );
      }

      // STEP 3: HALAMAN 3 - BUKTI RONDOWN ACARA HARIAN
      console.log('🎯 ===== HALAMAN 3: BUKTI RONDOWN ACARA HARIAN =====');
      const fileForRondown = pdu.buktiRondownAcaraHarian;
      console.log('   📁 Using file for Rondown:', fileForRondown);

      if (
        fileForRondown &&
        fileForRondown !== 'null' &&
        fileForRondown !== 'undefined'
      ) {
        const fileInfo = getFileUrlAndType(fileForRondown, 'rondown');

        if (fileInfo && fileInfo.url) {
          console.log(`   🔍 File type detected: ${fileInfo.fileType}`);

          if (fileInfo.fileType === 'image') {
            console.log('   🖼️ Embedding image file...');
            await addImageAsPage(
              mainPDF,
              fileInfo.url,
              'Bukti Rondown Acara Harian',
              pageWidth,
              pageHeight
            );
          } else if (fileInfo.fileType === 'pdf') {
            console.log('   📑 Embedding PDF file...');
            try {
              const pdfBytes = await downloadFile(fileInfo.url);
              const pdfDoc = await PDFDocument.load(pdfBytes);
              const pageCount = pdfDoc.getPageCount();

              for (let pageNum = 0; pageNum < pageCount; pageNum++) {
                mainPDF.addPage();
                const currentPage = mainPDF.internal.getNumberOfPages();

                let currentY = addStandardHeader(
                  mainPDF,
                  'Bukti Rondown Acara Harian',
                  pageCount > 1 ? `Halaman ${pageNum + 1}/${pageCount}` : null
                );

                await renderPDFPageAsSimpleImage(
                  mainPDF,
                  pdfDoc,
                  pageNum,
                  currentY
                );
              }
            } catch (error) {
              console.error(
                '   ❌ Failed to embed PDF, using fallback:',
                error
              );
              addFileInfoPage(
                mainPDF,
                'Bukti Rondown Acara Harian',
                fileForRondown,
                'File',
                pageWidth,
                pageHeight
              );
            }
          } else {
            console.log('   ❓ Unknown file type, using fallback');
            addFileInfoPage(
              mainPDF,
              'Bukti Rondown Acara Harian',
              fileForRondown,
              'File',
              pageWidth,
              pageHeight
            );
          }
        } else {
          addFileInfoPage(
            mainPDF,
            'Bukti Rondown Acara Harian',
            fileForRondown,
            'File',
            pageWidth,
            pageHeight
          );
        }
      } else {
        addEmptyDocumentPage(
          mainPDF,
          'Bukti Rondown Acara Harian',
          'Tidak ada bukti rondown acara harian'
        );
      }

      // STEP 4: HALAMAN 4+ - BUKTI DUKUNG ACARA (tetap sama)
      console.log(
        `🎯 ===== HALAMAN 4+: ${acaraWithKendala.length} BUKTI DUKUNG =====`
      );
      if (acaraWithKendala.length > 0) {
        for (let i = 0; i < acaraWithKendala.length; i++) {
          const acara = acaraWithKendala[i];
          const halamanNumber = 4 + i;
          console.log(
            `   🎬 Processing Halaman ${halamanNumber}: ${acara.namaAcara}`
          );

          if (acara.buktiDukung) {
            const fileInfo = getFileUrlAndType(acara.buktiDukung, 'dukung');
            if (fileInfo && fileInfo.url) {
              if (fileInfo.fileType === 'image') {
                await addImageAsPageWithAcaraInfo(
                  mainPDF,
                  fileInfo.url,
                  `Bukti Dukung: ${acara.namaAcara}`,
                  acara,
                  pageWidth,
                  pageHeight
                );
              } else if (fileInfo.fileType === 'pdf') {
                try {
                  const pdfBytes = await downloadFile(fileInfo.url);
                  const pdfDoc = await PDFDocument.load(pdfBytes);
                  const pageCount = pdfDoc.getPageCount();

                  for (let pageNum = 0; pageNum < pageCount; pageNum++) {
                    mainPDF.addPage();
                    const currentPage = mainPDF.internal.getNumberOfPages();

                    let currentY = addStandardHeader(
                      mainPDF,
                      `Bukti Dukung: ${acara.namaAcara}`,
                      pageCount > 1
                        ? `Halaman ${pageNum + 1}/${pageCount}`
                        : null
                    );

                    // Info acara hanya di halaman pertama
                    if (pageNum === 0) {
                      mainPDF.setFontSize(10);
                      mainPDF.setTextColor(0, 0, 0);

                      mainPDF.setFillColor(245, 245, 245);
                      mainPDF.rect(14, currentY, 182, 28, 'F');
                      mainPDF.setDrawColor(200, 200, 200);
                      mainPDF.rect(14, currentY, 182, 28);

                      mainPDF.text(
                        `Acara: ${acara.namaAcara || 'N/A'}`,
                        20,
                        currentY + 7
                      );
                      mainPDF.text(
                        `Tipe: ${acara.tipeAcara || 'N/A'}`,
                        20,
                        currentY + 15
                      );
                      mainPDF.text(
                        `Waktu: ${formatTime(acara.tanggalAcara)}`,
                        110,
                        currentY + 7
                      );
                      mainPDF.text(
                        `Kendala: ${acara.kendala || 'N/A'}`,
                        110,
                        currentY + 15
                      );

                      currentY += 35;
                    }

                    await renderPDFPageAsSimpleImage(
                      mainPDF,
                      pdfDoc,
                      pageNum,
                      currentY
                    );
                  }
                } catch (error) {
                  console.error(
                    `   ❌ Failed to embed PDF for ${acara.namaAcara}, using fallback:`,
                    error
                  );
                  addFileInfoPageWithAcaraInfo(
                    mainPDF,
                    `Bukti Dukung: ${acara.namaAcara}`,
                    acara.buktiDukung,
                    'File',
                    acara,
                    pageWidth,
                    pageHeight
                  );
                }
              } else {
                addFileInfoPageWithAcaraInfo(
                  mainPDF,
                  `Bukti Dukung: ${acara.namaAcara}`,
                  acara.buktiDukung,
                  'File',
                  acara,
                  pageWidth,
                  pageHeight
                );
              }
            } else {
              addFileInfoPageWithAcaraInfo(
                mainPDF,
                `Bukti Dukung: ${acara.namaAcara}`,
                acara.buktiDukung,
                'File',
                acara,
                pageWidth,
                pageHeight
              );
            }
          } else {
            addEmptyDocumentPageWithAcaraInfo(
              mainPDF,
              `Bukti Dukung: ${acara.namaAcara}`,
              'Tidak ada bukti dukung untuk acara ini',
              acara
            );
          }
        }
      } else {
        console.log('   ℹ️ Tidak ada acara dengan kendala');
        addEmptyDocumentPage(
          mainPDF,
          'Bukti Dukung Acara',
          'Tidak ada acara dengan kendala yang memerlukan bukti dukung'
        );
      }

      // STEP 5: TAMBAHKAN FOOTER KE SEMUA HALAMAN
      const totalPages = mainPDF.internal.getNumberOfPages();

      for (let i = 1; i <= totalPages; i++) {
        mainPDF.setPage(i);
        addStandardFooter(mainPDF, i, totalPages);
      }

      console.log('📑 ===== FINAL STRUCTURE =====');
      console.log('✅ Struktur PDF yang dihasilkan:');
      console.log('   - Halaman 1: Data PDU & Daftar Acara');
      console.log('   - Halaman 2: Bukti Surat Perintah Operasional');
      console.log('   - Halaman 3: Bukti Rondown Acara Harian');
      acaraWithKendala.forEach((acara, index) => {
        console.log(
          `   - Halaman ${4 + index}: Bukti Dukung - ${acara.namaAcara}`
        );
      });
      console.log(`📊 Total halaman: ${totalPages}`);

      // SIMPAN
      const fileName = `pdu-complete-${pdu.id}-${new Date().getTime()}.pdf`;
      mainPDF.save(fileName);

      console.log(
        `🎉 PDF "${fileName}" berhasil dibuat dengan struktur yang benar!`
      );
    } catch (error) {
      console.error('❌ ERROR:', error);
      alert('Gagal membuat PDF: ' + error.message);
    }
  };

  const handlePrintSingle = (pdu) => {
    printSinglePDUWithMerge(pdu);
  };

  const handleLogout = () => {
    if (window.confirm('Apakah Anda yakin ingin logout?')) {
      logout();
      navigate('/login');
    }
  };

  // Load PDF.js library dynamically
  useEffect(() => {
    if (!window.pdfjsLib) {
      const script = document.createElement('script');
      script.src =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js';
      script.onload = () => {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
        console.log('✅ PDF.js loaded successfully');
      };
      document.head.appendChild(script);
    }
  }, []);

  // Fetch data on component mount
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      fetchPDUData();
    }
  }, [isAuthenticated, authLoading]);

  return (
    <div>
      <div className="container-fluid">
        <h1 className="title">Notebook of Technical Director</h1>

        <div className="alert alert-info d-flex justify-content-between align-items-center sub-title">
          <span>
            👤 Login sebagai: <strong>{user?.name}</strong>
            {/* <br />
            <small className={isConnected ? 'text-success' : 'text-warning'}>
              {isConnected ? '🟢 Terhubung Real-time' : '🟡 Manual Mode'}
            </small>
            <br />
            <small className="text-info">🔄 Auto token refresh aktif</small> */}
          </span>
          <div>
            <button className="btn btn-outline-danger" onClick={handleLogout}>
              <img src={Logout} alt="Logout" className="icon me-2" /> Logout
            </button>
          </div>
        </div>

        {dataLoading && (
          <div className="alert alert-info text-center">
            <i className="fas fa-spinner fa-spin me-2"></i>
            {isConnected ? 'Memuat data real-time...' : 'Memuat data...'}
          </div>
        )}

        {error && (
          <div className="alert alert-danger">
            <i className="fas fa-exclamation-circle me-2"></i>
            {error}
          </div>
        )}

        {!dataLoading && pduData.length === 0 ? (
          <div className="alert alert-warning">
            <i className="fas fa-exclamation-triangle me-2"></i>
            Tidak ada data PDU yang tersedia.
          </div>
        ) : (
          !dataLoading && (
            <div className="table-responsive">
              <table className="table table-striped table-hover">
                <thead className="table-dark">
                  <tr>
                    <th scope="col">No</th>
                    <th scope="col">Tanggal</th>
                    <th scope="col">Nama TD</th>
                    <th scope="col">Nama PDU</th>
                    <th scope="col">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pduData.map((pdu, index) => {
                    const acaraCount = getAcaraByPDUId(pdu.id).length;
                    const availableFiles = getAvailableFiles(pdu);

                    return (
                      <tr key={pdu.id || index}>
                        <td>{index + 1}</td>
                        <td>
                          {formatDate(pdu.createdAt)}
                          {acaraCount > 0 && (
                            <small className="text-success d-block">
                              🎭 {acaraCount} acara
                            </small>
                          )}
                        </td>
                        <td>
                          <strong>{getTDName(pdu)}</strong>
                          {pdu.userId && !userDataMap[pdu.userId] && (
                            <small className="text-muted d-block">
                              ID: {pdu.userId}
                            </small>
                          )}
                        </td>
                        <td>{pdu.namePDU || 'N/A'}</td>
                        <td>
                          <div className="d-flex gap-2">
                            <button
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => handlePrintSingle(pdu)}
                              title="Print PDF Lengkap (Data + Semua Bukti File)"
                            >
                              🖨️ Print Lengkap
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        )}

        {pduData.length > 0 && (
          <div className="mt-3 text-muted text-center">
            📊 Menampilkan {pduData.length} data PDU • 🎭 Total{' '}
            {acaraData.length} acara dalam sistem
            {isConnected && (
              <span className="text-success d-block">
                💫 Real-time updates aktif - Data terupdate otomatis
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ListKPP;
