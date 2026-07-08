import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  vi: {
    translation: {
      common: {
        welcome: "Chào mừng",
        search: "Tìm kiếm...",
        save: "Lưu",
        cancel: "Hủy",
        edit: "Chỉnh sửa",
        delete: "Xóa",
        loading: "Đang tải...",
        actions: "Thao tác",
        details: "Chi tiết",
        status: "Trạng thái",
        all: "Tất cả",
        back: "Quay lại",
        next: "Tiếp theo",
        processing: "Đang xử lý...",
        days: {
          sun: "CN",
          mon: "T2",
          tue: "T3",
          wed: "T4",
          thu: "T5",
          fri: "T6",
          sat: "T7"
        }
      },
      nav: {
        home: "Trang chủ",
        services: "Dịch vụ",
        parts: "Linh kiện",
        team: "Đội ngũ",
        profile: "Hồ sơ",
        contact: "Liên hệ",
        booking: "Đặt lịch ngay",
        logout: "Đăng xuất",
        login: "Đăng nhập"
      },
      footer: {
        tagline: "Dịch vụ ô tô chính xác dành cho những chiếc xe đòi hỏi sự hoàn hảo.",
        certified: "Kỹ thuật viên được chứng nhận từ nhà máy, chẩn đoán đạt chuẩn đại lý và dịch vụ chăm sóc khách hàng cao cấp từ năm 2008.",
        services: "DỊCH VỤ",
        company: "CÔNG TY",
        contact: "LIÊN HỆ",
        rights: "© 2026 AGM Intelligent Service. All rights reserved.",
        maintenance: "Bảo dưỡng",
        repair: "Sửa chữa",
        diagnostics: "Chẩn đoán",
        detailing: "Chăm sóc xe",
        performance: "Tối ưu hiệu suất",
        aboutUs: "Về chúng tôi",
        team: "Đội ngũ",
        careers: "Tuyển dụng",
        news: "Tin tức",
        servicesHeader: "Dịch vụ",
        companyHeader: "Công ty",
        contactHeader: "Liên hệ",
        termsOfService: "Điều khoản dịch vụ",
        cookieSettings: "Cài đặt cookie"
      },
      profile: {
        title: "Thông tin cá nhân",
        personalInfo: "Thông tin cá nhân",
        fullName: "Họ và Tên",
        phone: "Số điện thoại",
        email: "Email",
        address: "Địa chỉ",
        recentActivity: "Hoạt động gần đây",
        viewAll: "Xem tất cả",
        myCar: "Xe của tôi",
        nextMaintenance: "Bảo dưỡng tiếp",
        carStatus: "Tình trạng",
        good: "Tốt",
        more: "nữa",
        viewCarDetails: "Xem chi tiết xe",
        historyTooltip: "Xem chi tiết trong Lịch sử sửa chữa",
        cancelPhoto: "Hủy chọn ảnh",
        saveNewPhoto: "Lưu ảnh đại diện mới",
        changeAvatar: "Thay đổi ảnh đại diện",
        editNotice: "* Bạn có thể thay đổi các thông tin trên và nhấn nút Lưu để áp dụng.",
        viewCarAlert: "Chuyển đến trang quản lý thông số kỹ thuật xe chi tiết...",
        goldMember: "Thành viên Vàng",
        joined: "Tham gia từ:",
        tierProgress: "Tiến trình hạng: Bạch Kim",
        pointsRemaining: "Còn 150 điểm để đạt hạng Bạch Kim",
        updateSuccess: "Cập nhật thông tin thành công!",
        updateFail: "Cập nhật thất bại, vui lòng thử lại.",
        avatarUpdateSuccess: "Cập nhật ảnh đại diện thành công!",
        avatarUpdateFail: "Cập nhật ảnh đại diện thất bại, vui lòng thử lại.",
        support: "Trợ giúp & Hỗ trợ",
        supportMessage: "Hệ thống hỗ trợ trực tuyến đang kết nối...",
        logoutConfirm: "Bạn có chắc chắn muốn đăng xuất?",
        logout: "Đăng xuất",
        userProfile: "Hồ sơ người dùng",
        tabs: {
          dashboard: "Hồ sơ người dùng",
          vehicles: "Xe sở hữu",
          appointments: "Lịch hẹn",
          history: "Lịch sử sửa chữa",
          warranty: "Bảo hành",
          settings: "Cài đặt"
        }
      },
      notification: {
        title: "Thông báo",
        markAllRead: "Đọc tất cả",
        empty: "Không có thông báo mới",
        clearAll: "Xóa tất cả",
        item1: {
          title: "Lịch hẹn được xác nhận",
          desc: "Lịch hẹn bảo dưỡng định kỳ xe Porsche 911 Carrera lúc 10:30 AM ngày 03/06/2026 đã được xác nhận.",
          time: "2 giờ trước"
        },
        item2: {
          title: "Báo giá đã phê duyệt",
          desc: "Yêu cầu báo giá cân chỉnh thước lái & đảo lốp 3D (BG-2023-4912) đã được duyệt thành công.",
          time: "1 ngày trước"
        },
        item3: {
          title: "Khuyến nghị bảo trì",
          desc: "Ắc quy xe BMW M4 Competition có dấu hiệu yếu nguồn điện. Bạn nên đặt lịch kiểm tra sớm.",
          time: "3 ngày trước"
        }
      },
      history: {
        title: "Lịch sử sửa chữa",
        description: "Xem lại lịch sử sửa chữa, bảo dưỡng và các hóa đơn dịch vụ của bạn.",
        invoiceId: "Mã hóa đơn",
        date: "Ngày thực hiện",
        vehicle: "Xe",
        service: "Dịch vụ",
        totalPrice: "Tổng tiền",
        status: "Trạng thái",
        invoiceDetail: "Chi tiết hóa đơn",
        downloadPdf: "Tải hóa đơn PDF",
        vehicleLabel: "Phương tiện:",
        invoiceDate: "Ngày lập hóa đơn:",
        itemDetails: "Chi tiết hạng mục",
        item: "Hạng mục",
        qty: "SL",
        price: "Đơn giá",
        technician: "Kỹ thuật viên phụ trách:",
        laborCost: "Chi phí nhân công:",
        partsCost: "Chi phí linh kiện:",
        discount: "Khấu trừ / Giảm giá:",
        vat: "Thuế VAT (10%):",
        grandTotal: "TỔNG THANH TOÁN:",
        close: "Đóng",
        pdfAlert: "Đang chuẩn bị tải PDF cho hóa đơn {{id}}...",
        status_Hoànthành: "Hoàn thành",
        status_Đangxửlý: "Đang xử lý",
        status_Đãhủy: "Đã hủy"
      },
      vehicles: {
        oilLevel: "Mức dầu",
        tirePressure: "Áp suất lốp",
        brakePads: "Má phanh",
        batteryStatus: "Tình trạng ắc quy",
        fair: "Trung bình",
        desc: "Quản lý đội xe và theo dõi tình trạng bảo trì của bạn.",
        addNew: "Thêm xe mới",
        detailsPorsche: "Đời xe: 2023 • Màu: Bạc GT Silver",
        detailsBMW: "Đời xe: 2022 • Màu: Xanh Portimao Blue",
        statusGood: "Hoạt động tốt",
        statusPending: "Cần bảo trì sớm",
        partsStatus: "Tình trạng linh kiện",
        loadingHistory: "Đang tải dữ liệu toàn bộ lịch sử bảo trì...",
        loadingDetails: "Hiển thị trang thông số kỹ thuật chi tiết của xe...",
        bookingRedirect: "Hệ thống chuyển sang quy trình đặt lịch trực tuyến nhanh...",
        initAddVehicle: "Tính năng thêm xe mới đang được khởi tạo..."
      },
      appointments: {
        title: "Đặt lịch hẹn dịch vụ",
        description: "Hoàn thành các bước dưới đây để đặt lịch chăm sóc cho xế yêu của bạn.",
        steps: {
          selectVehicle: "Chọn xe",
          selectService: "Chọn dịch vụ",
          selectTime: "Chọn thời gian",
          confirm: "Xác nhận"
        },
        selectVehicleTitle: "Chọn phương tiện của bạn",
        selectServiceTitle: "Chọn dịch vụ cần thiết",
        popular: "PHỔ BIẾN",
        selected: "Đã chọn",
        select: "Chọn",
        selectTimeTitle: "Chọn thời gian phù hợp",
        monthYear: "Tháng 10, 2023",
        dayOfWeek: "Thứ 3",
        availableTimeSlots: "Khung giờ trống",
        summaryTitle: "Tóm tắt dịch vụ",
        vehicle: "Phương tiện",
        time: "Thời gian",
        selectedService: "Dịch vụ đã chọn",
        vatLabel: "Thuế (VAT 10%)",
        estimatedTime: "Thời gian dự kiến:",
        totalPrice: "Tổng cộng:",
        viewQuote: "Xem báo giá",
        accept: "Chấp nhận",
        accepted: "Đã chấp nhận",
        decline: "Từ chối",
        securedBy: "Đảm bảo bởi AGM Intelligent",
        detailedQuoteAlert: "Báo giá chi tiết:\n- {{title}}: {{price}}đ\n- Thuế VAT (10%): {{vat}}đ\n=> TỔNG THÀNH TIỀN: {{total}}đ",
        successAlert: "Hệ thống xác nhận và đặt lịch hẹn thành công! Xin cảm ơn quý khách.",
        services: {
          thaynhot: "Thay nhớt",
          thaynhotDesc: "Nhớt tổng hợp cao cấp",
          durationThayNhot: "60 phút",
          canchinh: "Cân chỉnh lốp",
          canchinhDesc: "Kiểm tra áp suất & đảo lốp",
          durationCanChinh: "45 phút",
          tongquat: "Kiểm tra tổng quát",
          tongquatDesc: "50 điểm kỹ thuật chi tiết",
          durationTongQuat: "120 phút"
        }
      },
      warranty: {
        quotesTitle: "Yêu cầu duyệt báo giá",
        quotesDesc: "Xem các phát sinh kỹ thuật được phát hiện trong quá trình kiểm tra xe và phê duyệt phương án xử lý.",
        estimatedCost: "Tổng giá dự toán",
        rejectQuoteTooltip: "Từ chối báo giá",
        approve: "Đồng ý",
        infoTitle: "Thông tin bảo hành",
        infoDesc: "Theo dõi chính sách và thời hạn bảo hành cho các linh kiện đã được thay thế tại xưởng dịch vụ.",
        policyId: "Mã bảo hành",
        partName: "Linh kiện",
        activationDate: "Ngày kích hoạt",
        expirationDate: "Hạn bảo hành",
        duration: "Thời hạn",
        quoteDetailTitle: "Chi tiết báo giá dự kiến",
        repairItem: "Hạng mục sửa chữa",
        techRecommendation: "Lý do & Khuyến nghị của kỹ thuật viên",
        laborPartsCost: "Chi phí linh kiện & nhân công:",
        grandTotalEstimate: "TỔNG DỰ TOÁN:",
        approvePlan: "Đồng ý phương án",
        reject: "Từ chối",
        sentDate: "Ngày gửi:",
        statusActive: "Đang bảo hành",
        statusExpired: "Hết hạn",
        statusPending: "Chờ phê duyệt",
        statusApproved: "Đã đồng ý",
        statusRejected: "Đã từ chối",
        approveSuccessAlert: "Đồng ý báo giá thành công! Kỹ thuật viên sẽ liên hệ hẹn thời gian sửa chữa.",
        rejectSuccessAlert: "Đã từ chối báo giá dịch vụ.",
        parts: {
          oilFilter: "Lọc nhớt chính hãng OEM",
          brakePads: "Má phanh Ceramic Pro",
          cabinFilter: "Lọc gió carbon điều hòa"
        },
        durations: {
          sixMonths: "6 tháng",
          twelveMonths: "12 tháng"
        },
        services: {
          coolantPump: "Thay Cụm Bơm Nước Làm Mát",
          coolantPumpDesc: "Phát hiện rò rỉ nước làm mát nhẹ quanh gioăng bơm nước khi kiểm tra tổng quát định kỳ. Khuyến nghị thay thế sớm để tránh quá nhiệt động cơ.",
          alignment: "Cân Chỉnh Thước Lái & Đảo Lốp 3D",
          alignmentDesc: "Lốp xe có dấu hiệu mòn không đều. Khuyến nghị căn chỉnh thước lái bằng máy Hunter 3D và đảo lốp."
        }
      },
      settings: {
        title: "Cài đặt hệ thống",
        profileCard: "Hồ sơ cá nhân",
        avatar: "Ảnh đại diện",
        fullNameLabel: "Họ và tên",
        phoneLabel: "Số điện thoại",
        security: "Bảo mật",
        changePasswordTitle: "Đổi mật khẩu tài khoản",
        changePasswordDesc: "Thay đổi mật khẩu thường xuyên giúp tăng cường độ bảo mật cho thông tin cá nhân của bạn.",
        changePasswordBtn: "Đổi mật khẩu",
        changePasswordSuccess: "Đổi mật khẩu thành công!",
        changePasswordFail: "Thay đổi mật khẩu thất bại. Vui lòng kiểm tra lại.",
        currentPasswordLabel: "Mật khẩu hiện tại",
        newPasswordLabel: "Mật khẩu mới",
        confirmPasswordLabel: "Xác nhận mật khẩu mới",
        notifications: "Thông báo",
        notificationsDesc: "Quản lý cách bạn nhận lời nhắc bảo trì và cập nhật lịch hẹn.",
        notifyPush: "Thông báo đẩy",
        customization: "Tùy chỉnh",
        darkMode: "Chế độ tối",
        appInfo: "Thông tin ứng dụng",
        appVersion: "Phiên bản: 2.4.0 (Build 108)",
        terms: "Điều khoản",
        termsAlert: "Điều khoản sử dụng dịch vụ AGM Intelligent.",
        privacy: "Quyền riêng tư",
        privacyAlert: "Chính sách bảo mật dữ liệu.",
        cancelAlert: "Đã hủy bỏ các thay đổi cài đặt chưa lưu.",
        saving: "Đang lưu...",
        saveChanges: "Lưu thay đổi",
        passwordMismatch: "Mật khẩu mới và xác nhận mật khẩu không khớp!"
      },
      team: {
        heroTitle: "Đội ngũ chuyên gia",
        heroDesc: "Những kỹ thuật viên tay nghề cao và tận tâm nhất, cam kết mang lại sự an toàn tuyệt đối cho hành trình của bạn.",
        leadersLabel: "LÃNH ĐẠO",
        leadersTitle: "Ban điều hành",
        leaders: {
          tuan: {
            role: "Sáng lập & Giám đốc điều hành",
            bio: "Với hơn 20 năm kinh nghiệm trong ngành công nghiệp ô tô, ông Tuấn đã xây dựng AGM dựa trên triết lý \"Chính trực & Chính xác\". Ông tin rằng sự minh bạch là chìa khóa để xây dựng niềm tin lâu dài với khách hàng."
          },
          ha: {
            role: "Giám đốc dịch vụ",
            bio: "Chuyên gia quản lý quy trình kỹ thuật đạt chuẩn quốc tế. Bà Hà đảm bảo mọi quy trình sửa chữa tại AGM Intelligent đều tuân thủ nghiêm ngặt các tiêu chuẩn an toàn và hiệu suất cao nhất."
          }
        },
        techsLabel: "ĐỘI NGŨ KỸ THUẬT",
        techsTitle: "Chuyên gia kỹ thuật",
        techsDesc: "Tập hợp những đôi bàn tay vàng về trí tuệ công nghệ hàng đầu trong lĩnh vực bảo trì ô tô.",
        specialties: {
          engine: "Chuyên gia động cơ",
          hybridEv: "Chuyên gia Hybrid/EV",
          diagnostic: "Chuyên gia chẩn đoán",
          chassisBrakes: "Hệ thống gầm & phanh"
        },
        badges: {
          experience15: "15 năm kinh nghiệm",
          teslaCertified: "Tesla Certified",
          masterDiagnostic: "Master Diagnostic",
          safetyExpert: "Chuyên gia an toàn"
        },
        techs: {
          nam: {
            desc: "Chuyên gia hàng đầu về động cơ ô tô, tối ưu hóa hiệu suất cho các dòng xe châu Âu."
          },
          duc: {
            desc: "Dẫn đầu công nghệ xe điện và hệ thống điện cao áp, đảm bảo an toàn tuyệt đối cho xe của bạn."
          },
          hung: {
            desc: "Bậc thầy phát hiện lỗi hệ thống bằng công nghệ máy tính, xử lý mọi vấn đề hóc búa nhất."
          },
          viet: {
            desc: "Chăm chút từng milimét hệ thống phanh và treo, mang lại sự êm ái và an toàn trên mọi địa hình."
          }
        },
        ctaTitle: "Gia nhập đội ngũ của chúng tôi",
        ctaDesc: "Bạn có đam mê với ô tô và mong muốn làm việc trong môi trường chuyên nghiệp, hiện đại? Chúng tôi luôn chào đón những tài năng mới.",
        viewJobs: "Xem vị trí tuyển dụng",
        sendResume: "Gửi hồ sơ"
      },
      services: {
        heroTitle: "Dịch vụ chuyên nghiệp",
        heroDesc: "Nâng tầm trải nghiệm bảo dưỡng xe với đội ngũ kỹ thuật viên tay nghề cao và công nghệ chẩn đoán tiên tiến nhất. Chúng tôi cam kết mang lại sự an toàn tuyệt đối cho mọi hành trình của bạn.",
        emergencyConsult: "Tư vấn nhanh",
        forYourCar: "DÀNH CHO XE CỦA BẠN",
        catalogTitle: "Danh mục dịch vụ",
        searchPlaceholder: "Tìm kiếm dịch vụ bảo dưỡng...",
        originalPriceLabel: "Giá gốc:",
        discountLabel: "Giảm {{percent}}%",
        promoBadge: "Khuyến mãi",
        categories: {
          maintenance: "Bảo dưỡng",
          repair: "Sửa chữa"
        },
        noResults: "Không tìm thấy kết quả",
        noResultsDesc: "Không tìm thấy dịch vụ nào phù hợp với từ khóa \"{{query}}\". Vui lòng thử từ khóa khác hoặc thiết lập lại bộ lọc.",
        resetFilters: "Thiết lập lại bộ lọc",
        callRescue: "Gọi cứu hộ",
        bookService: "Đặt dịch vụ",
        whyChooseUsTitle: "Tại sao chọn AGM Intelligent?",
        whyChooseUs: {
          techs: {
            title: "Kỹ thuật viên",
            desc: "Đội ngũ chuyên gia được đào tạo bài bản và giàu kinh nghiệm thực tế."
          },
          parts: {
            title: "Phụ tùng chính hãng",
            desc: "Cam kết sử dụng 100% linh kiện chính hãng, rõ ràng nguồn gốc xuất xứ."
          },
          pricing: {
            title: "Giá cả minh bạch",
            desc: "Báo giá chi tiết trước khi thực hiện, không phát sinh chi phí ẩn."
          },
          warranty: {
            title: "Bảo hành dài hạn",
            desc: "Chính sách bảo hành uy tín cho mọi hạng mục sửa chữa và phụ tùng."
          }
        },
        faqTitle: "Câu hỏi thường gặp về dịch vụ",
        faqs: {
          q1: "Bao lâu tôi nên bảo dưỡng xe một lần?",
          q2: "Tôi có cần đặt lịch trước không?",
          q3: "AGM Intelligent có hỗ trợ xe mượn khi sửa chữa lâu không?"
        },
        list: {
          periodic: {
            title: "Bảo dưỡng định kỳ",
            desc: "Kiểm tra tổng quát và thay thế linh kiện hao mòn định kỳ để xe luôn vận hành êm ái.",
            price: "Từ 500.000đ",
            originalPrice: "Từ 550.000đ",
            promoText: "Tặng nước rửa kính cao cấp & kiểm tra lốp miễn phí",
            duration: "60 - 120 phút",
            details: [
              "Thay nhớt động cơ chính hãng phù hợp thông số xe.",
              "Kiểm tra và làm sạch lọc gió động cơ, lọc gió cabin.",
              "Kiểm tra hệ thống phanh, má phanh, đĩa phanh.",
              "Kiểm tra bình ắc quy và hệ thống chiếu sáng.",
              "Đọc lỗi lỗi hộp đen (OBD) bằng thiết bị chuyên dụng."
            ]
          },
          engine: {
            title: "Sửa chữa động cơ",
            desc: "Xử lý triệt để các vấn đề phức tạp của động cơ bởi các chuyên gia dày dạn kinh nghiệm.",
            price: "Từ 1.200.000đ",
            originalPrice: "Từ 1.400.000đ",
            promoText: "Giảm 15% gói vệ sinh kim phun buồng đốt đi kèm",
            duration: "Buổi hoặc ngày (tùy tình trạng)",
            details: [
              "Đo áp suất buồng đốt, kiểm tra tỉ số nén động cơ.",
              "Xử lý hiện tượng rò rỉ dầu máy, hao nước làm mát.",
              "Cân chỉnh cam, khắc phục tiếng gõ động cơ lạ.",
              "Đại tu động cơ chuyên nghiệp theo tiêu chuẩn hãng.",
              "Vệ sinh kim phun, họng hút và buồng đốt bằng máy chuyên dụng."
            ]
          },
          tireBrake: {
            title: "Dịch vụ lốp & phanh",
            desc: "Đảm bảo an toàn tối đa với dịch vụ kiểm tra lốp, cân bằng động và bảo dưỡng hệ thống phanh.",
            price: "Từ 400.000đ",
            originalPrice: "Từ 500.000đ",
            promoText: "Miễn phí cân bằng động khi thay từ 2 lốp Michelin",
            duration: "30 - 60 phút",
            details: [
              "Cân chỉnh thước lái 3D tiên tiến nhất hiện nay.",
              "Cân bằng động lốp xe triệt tiêu hiện tượng rung vô lăng.",
              "Láng đĩa phanh trực tiếp không cần tháo rời.",
              "Thay mới má phanh chính hãng nhập khẩu.",
              "Kiểm tra toàn bộ đường ống dẫn dầu và cụm heo phanh."
            ]
          },
          detailing: {
            title: "Chăm sóc nội thất",
            desc: "Làm sạch sâu, khử mùi và bảo dưỡng các bề mặt da, nhựa bên trong xe như mới.",
            price: "Từ 800.000đ",
            originalPrice: "Từ 900.000đ",
            promoText: "Tặng gói khử mùi cabin Ozon trị giá 200.000đ",
            duration: "120 - 240 phút",
            details: [
              "Dọn nội thất toàn diện, hút bụi và giặt thảm sàn.",
              "Vệ sinh bề mặt da ghế bằng dung dịch chuyên sâu bảo vệ da.",
              "Khử trùng hệ thống điều hòa và khử mùi ozon cabin.",
              "Dưỡng bóng táp-lô, táp-pi cửa chống lão hóa tia UV.",
              "Làm sạch trần nỉ và cốp sau tỉ mỉ."
            ]
          },
          electronics: {
            title: "Chẩn đoán điện tử",
            desc: "Sử dụng máy quét chuyên dụng để phát hiện chính xác mọi lỗi hệ thống điện tử trên xe.",
            price: "Từ 300.000đ",
            originalPrice: "Từ 350.000đ",
            promoText: "Miễn phí chẩn đoán lỗi OBD nhanh bằng máy chuyên dụng",
            duration: "30 - 45 phút",
            details: [
              "Quét toàn bộ lỗi hệ thống điện thân xe, hộp điều khiển.",
              "Chẩn đoán lỗi cảm biến ABS, ESP, túi khí SRS.",
              "Kiểm tra tình trạng máy phát điện, máy khởi động.",
              "Cập nhật phần mềm hệ thống (ECU flashing) nếu có.",
              "Xóa các mã lỗi ảo phát sinh do sụt điện."
            ]
          },
          rescue: {
            title: "Cứu hộ 24/7",
            desc: "Hỗ trợ khẩn cấp mọi lúc, mọi nơi khi xe gặp sự cố bất ngờ trên đường.",
            price: "Liên hệ",
            originalPrice: "",
            promoText: "Hỗ trợ khẩn cấp 24/7 toàn khu vực nội thành",
            duration: "Phản hồi trong 15 - 30 phút",
            details: [
              "Hỗ trợ kích nổ ắc quy tại chỗ nhanh chóng.",
              "Hỗ trợ thay lốp dự phòng khẩn cấp.",
              "Cung cấp nhiên liệu khẩn cấp trên đường.",
              "Xe cẩu kéo chuyên dụng đưa về trung tâm gần nhất.",
              "Đội ngũ cứu hộ túc trực sẵn sàng 24 giờ mỗi ngày."
            ]
          }
        },
        modal: {
          duration: "Thời gian: {{duration}}",
          price: "Giá dự kiến: {{price}}",
          descriptionLabel: "Mô tả dịch vụ",
          itemsLabel: "Các hạng mục công việc",
          guarantee: "Tất cả dịch vụ được thực hiện bởi kỹ thuật viên tay nghề cao và bảo hành chính hãng tối thiểu 6 tháng tại hệ thống AGM Intelligent."
        }
      },
      parts: {
        heroTitle: "Linh kiện chính hãng",
        heroDesc: "Nâng tầm hiệu suất và độ an toàn cho xế yêu với hệ thống linh kiện nhập khẩu 100%, bảo hành dài hạn và hỗ trợ lắp đặt chuyên nghiệp.",
        badges: {
          genuine: {
            title: "100% chính hãng",
            desc: "Cam kết chất lượng từ nhà sản xuất"
          },
          warranty: {
            title: "Bảo hành dài hạn",
            desc: "An tâm tuyệt đối với chính sách 1 đổi 1"
          },
          install: {
            title: "Hỗ trợ lắp đặt",
            desc: "Miễn phí công thay tại các chi nhánh"
          }
        },
        filterTitle: "Bộ lọc",
        vehicleTypeLabel: "Loại xe",
        vehicleTypes: {
          all: "Tất cả loại xe",
          sport: "Xe thể thao"
        },
        brandLabel: "Thương hiệu",
        maxPriceLabel: "Giá tối đa (VNĐ)",
        searchPlaceholder: "Tìm kiếm linh kiện (tên, mã)...",
        foundCount: "Tìm thấy: ",
        foundCountSuffix: " linh kiện",
        sortLabel: "Sắp xếp:",
        sortOptions: {
          popular: "Phổ biến nhất",
          priceAsc: "Giá: Thấp đến cao",
          priceDesc: "Giá: Cao đến thấp",
          newest: "Mới nhất"
        },
        noProducts: "Không tìm thấy sản phẩm",
        noProductsDesc: "Không có linh kiện nào phù hợp với bộ lọc và từ khóa hiện tại. Vui lòng thiết lập lại bộ lọc để xem đầy đủ sản phẩm.",
        buyNow: "Mua ngay",
        inStock: "Còn hàng",
        outOfStock: "Hết hàng",
        modal: {
          code: "Mã linh kiện:",
          warranty: "Thời gian bảo hành:",
          compatibility: "Dòng xe tương thích:",
          description: "Mô tả sản phẩm:"
        },
        orderNow: "Đặt mua ngay",
        alerts: {
          addedToQuote: "Đã thêm \"{{name}}\" vào yêu cầu báo giá của bạn.",
          ordered: "Đã thêm \"{{name}}\" vào yêu cầu đặt mua. Bộ phận chăm sóc khách hàng sẽ liên hệ sớm nhất."
        },
        list: {
          brake: {
            name: "Má phanh Ceramic Pro",
            desc: "Độ bền cao, giảm tiếng ồn và bụi phanh, phù hợp cho các dòng xe cao cấp.",
            warranty: "12 tháng"
          },
          oilFilter: {
            name: "Lọc dầu Synthetic",
            desc: "Lọc sạch 99% tạp chất, giúp động cơ vận hành êm ái và bền bỉ.",
            warranty: "06 tháng"
          },
          sparkPlug: {
            name: "Bugi Iridium High-Performance",
            desc: "Đánh lửa cực mạnh, tiết kiệm nhiên liệu và tăng tốc mượt mà.",
            warranty: "12 tháng"
          },
          shock: {
            name: "Giảm xóc Gas-Filled",
            desc: "Cải thiện độ ổn định khi vào cua và mang lại cảm giác lái êm ái.",
            warranty: "24 tháng"
          },
          airFilter: {
            name: "Lọc gió động cơ OEM",
            desc: "Tối ưu lưu lượng khí nạp, bảo vệ động cơ khỏi bụi bẩn và dị vật.",
            warranty: "03 tháng"
          },
          battery: {
            name: "Ắc quy khô 70Ah",
            desc: "Công nghệ miễn bảo dưỡng, khởi động mạnh mẽ ngay cả khi trời lạnh.",
            warranty: "18 tháng"
          },
          oil: {
            name: "Dầu động cơ Synthetic 5W-30",
            desc: "Bảo vệ động cơ tối đa trong mọi điều kiện nhiệt độ khắc nghiệt."
          },
          wiper: {
            name: "Gạt mưa Silicon cao cấp",
            desc: "Lau sạch nước mưa hoàn hảo, bền bỉ gấp 3 lần gạt cao su thông thường.",
            warranty: "06 tháng"
          },
          coolant: {
            name: "Nước làm mát tản nhiệt",
            desc: "Giúp hạ nhiệt động cơ nhanh chóng, bảo vệ hệ thống làm mát khỏi ăn mòn."
          }
        }
      },
      booking: {
        heroTitle: "Đặt lịch dịch vụ",
        heroDesc: "Trải nghiệm quy trình dịch vụ bảo dưỡng tối giản, đặt lịch trong 1 phút để nhận hỗ trợ kỹ thuật tận tâm tại hệ thống AGM Intelligent.",
        selectBookingMode: "Chọn hình thức đặt lịch",
        aiConsultation: "Tham khảo tư vấn AI",
        serviceBooking: "Đặt lịch dịch vụ",
        savedVehicle: "Chọn xe đã lưu",
        addNewVehicle: "Thêm xe mới",
        directConsultation: "Tư vấn trực tiếp",
        consultationBooking: "Đặt lịch tư vấn",
        selectServiceOrRepair: "Chọn dịch vụ hoặc Sửa chữa lỗi",
        selectService: "Chọn dịch vụ",
        checkAndRepair: "Kiểm tra và sửa chữa lỗi",
        comboPackage: "Gói Combo",
        singleService: "Dịch vụ lẻ",
        discountText: "Giảm {{percent}}%",
        comboBadge: "Combo",
        comboPromoPrice: "Giá combo ưu đãi",
        comboOverlapWarning: "Gói Combo này bao gồm các dịch vụ bạn đã chọn lẻ. Các dịch vụ lẻ trùng lặp sẽ tự động được bỏ chọn để tránh trùng lặp!",
        steps: {
          service: "Dịch vụ",
          time: "Thời gian",
          vehicle: "Thông tin xe",
          contact: "Liên hệ"
        },
        services: {
          popularBadge: "Phổ biến",
          emergencyBadge: "Khẩn cấp",
          periodic: {
            title: "Bảo Dưỡng Định Kỳ",
            desc: "Kiểm tra tổng quát và thay thế linh kiện hao mòn định kỳ để xe luôn vận hành êm ái.",
            details: [
              "Thay nhớt động cơ chính hãng phù hợp thông số xe.",
              "Kiểm tra và làm sạch lọc gió động cơ, lọc gió cabin.",
              "Kiểm tra hệ thống phanh, má phanh, đĩa phanh.",
              "Kiểm tra bình ắc quy và hệ thống chiếu sáng.",
              "Đọc lỗi lỗi hộp đen (OBD) bằng thiết bị chuyên dụng."
            ]
          },
          engine: {
            title: "Sửa Chữa Động Cơ",
            desc: "Xử lý triệt để các vấn đề phức tạp của động cơ bởi các chuyên gia dày dạn kinh nghiệm.",
            details: [
              "Đo áp suất buồng đốt, kiểm tra tỉ số nén động cơ.",
              "Xử lý hiện tượng rò rỉ dầu máy, hao nước làm mát.",
              "Cân chỉnh cam, khắc phục tiếng gõ động cơ lạ.",
              "Đại tu động cơ chuyên nghiệp theo tiêu chuẩn hãng.",
              "Vệ sinh kim phun, họng hút và buồng đốt bằng máy chuyên dụng."
            ]
          },
          tireBrake: {
            title: "Dịch Vụ Lốp & Phanh",
            desc: "Đảm bảo an toàn tối đa với dịch vụ kiểm tra lốp, cân bằng động và bảo dưỡng hệ thống phanh.",
            details: [
              "Cân chỉnh thước lái 3D tiên tiến nhất hiện nay.",
              "Cân bằng động lốp xe triệt tiêu hiện tượng rung vô lăng.",
              "Láng đĩa phanh trực tiếp không cần tháo rời.",
              "Thay mới má phanh chính hãng nhập khẩu.",
              "Kiểm tra toàn bộ đường ống dẫn dầu và cụm heo phanh."
            ]
          },
          detailing: {
            title: "Chăm Sóc Nội Thất",
            desc: "Làm sạch sâu, khử mùi và bảo dưỡng các bề mặt da, nhựa bên trong xe như mới.",
            details: [
              "Dọn nội thất toàn diện, hút bụi và giặt thảm sàn.",
              "Vệ sinh bề mặt da ghế bằng dung dịch chuyên sâu bảo vệ da.",
              "Khử trùng hệ thống điều hòa và khử mùi ozon cabin.",
              "Dưỡng bóng táp-lô, táp-pi cửa chống lão hóa tia UV.",
              "Làm sạch trần nỉ và cốp sau tỉ mỉ."
            ]
          },
          electronics: {
            title: "Chẩn Đoán Điện Tử",
            desc: "Sử dụng máy quét chuyên dụng để phát hiện chính xác mọi lỗi hệ thống điện tử trên xe.",
            details: [
              "Quét toàn bộ lỗi hệ thống điện thân xe, hộp điều khiển.",
              "Chẩn đoán lỗi cảm biến ABS, ESP, túi khí SRS.",
              "Kiểm tra tình trạng máy phát điện, máy khởi động.",
              "Cập nhật phần mềm hệ thống (ECU flashing) nếu có.",
              "Xóa các mã lỗi ảo phát sinh do sụt điện."
            ]
          },
          rescue: {
            title: "Cứu Hộ 24/7",
            desc: "Hỗ trợ khẩn cấp mọi lúc, mọi nơi khi xe gặp sự cố bất ngờ trên đường.",
            details: [
              "Hỗ trợ kích nổ ắc quy tại chỗ nhanh chóng.",
              "Hỗ trợ thay lốp dự phòng khẩn cấp.",
              "Cung cấp nhiên liệu khẩn cấp trên đường.",
              "Xe cẩu kéo chuyên dụng đưa về trung tâm gần nhất.",
              "Đội ngũ cứu hộ túc trực sẵn sàng 24 giờ mỗi ngày."
            ]
          }
        },
        timeSlots: {
          morning: "Sáng",
          afternoon: "Chiều"
        },
        alerts: {
          validationError: "Vui lòng điền đầy đủ và đúng thông tin yêu cầu của bước hiện tại.",
          minOneTask: "Bạn phải chọn ít nhất một hạng mục công việc."
        },
        success: {
          title: "Đặt lịch thành công!",
          desc: "Mã đặt lịch của bạn là {{code}}. Chúng tôi đã gửi email xác nhận chi tiết lịch hẹn của bạn. Bộ phận chăm sóc khách hàng sẽ liên hệ với bạn trong vòng 15 phút.",
          goHome: "Về trang chủ",
          bookAnother: "Đặt dịch vụ khác"
        },
        summary: {
          serviceLabel: "Dịch vụ:",
          timeLabel: "Thời gian:",
          plateLabel: "Biển số xe:",
          customerLabel: "Khách hàng:",
          itemsLabel: "Hạng mục thực hiện:"
        },
        step1: {
          title: "Chọn dịch vụ bảo dưỡng",
          estimatedPrice: "Giá dự kiến",
          customizeTasks: "Tùy chỉnh hạng mục công việc",
          customizeTasksDesc: "Chọn hoặc bỏ chọn các hạng mục cụ thể bạn mong muốn thực hiện trong gói dịch vụ."
        },
        step2: {
          title: "Chọn thời gian hẹn",
          dateLabel: "Chọn ngày hẹn",
          timeLabel: "Chọn khung giờ"
        },
        step3: {
          title: "Thông tin phương tiện",
          brandLabel: "Hãng xe",
          brandPlaceholder: "Ví dụ: Toyota, BMW, Mazda...",
          modelLabel: "Dòng xe (Model)",
          modelPlaceholder: "Ví dụ: Camry, 320i, CX-5...",
          plateLabel: "Biển số xe",
          platePlaceholder: "Ví dụ: 30A-123.45 hoặc 51F-999.99"
        },
        step4: {
          title: "Thông tin liên hệ",
          nameLabel: "Họ và tên",
          namePlaceholder: "Nguyễn Văn A",
          phoneLabel: "Số điện thoại",
          phonePlaceholder: "0912345678",
          emailLabel: "Địa chỉ Email",
          emailPlaceholder: "khachhang@example.com"
        },
        buttons: {
          back: "Quay lại",
          processing: "Đang xử lý...",
          confirm: "Xác nhận đặt lịch",
          next: "Tiếp theo"
        },
        sidebar: {
          title: "Tóm tắt đặt lịch",
          serviceLabel: "Dịch vụ đã chọn",
          notSelected: "Chưa chọn",
          timeLabel: "Thời gian hẹn",
          vehicleLabel: "Phương tiện",
          notEntered: "Chưa nhập",
          servicePrice: "Giá dịch vụ",
          installationFee: "Công lắp đặt / kiểm tra",
          free: "Miễn phí",
          total: "Tổng cộng",
          estimatedNote: "* Giá tạm tính",
          itemsLabel: "Hạng mục đã chọn"
        },
        hotline: {
          title: "Cần tư vấn trực tiếp?",
          value: "Hotline: 1900 1234"
        }
      },
      home: {
        hero: {
          badge: "Được chứng nhận bởi 12 nhà sản xuất xe hàng đầu",
          title1: "Chăm sóc ",
          title2: "Xế yêu",
          desc1: "Đội ngũ kỹ thuật viên đạt chứng nhận từ nhà máy. Quy trình chẩn đoán chuẩn hãng.",
          desc2: "Dịch vụ đẳng cấp dành cho những dòng xe đòi hỏi sự hoàn hảo tuyệt đối.",
          bookBtn: "Đặt lịch ngay",
          exploreBtn: "Trải nghiệm dịch vụ",
          badge1: "Bảo dưỡng động cơ",
          badge2: "Chẩn đoán điện tử & ECU",
          badge3: "Hệ thống phanh an toàn"
        },
        stats: {
          experience: "Năm kinh nghiệm",
          maintained: "Xe đã bảo dưỡng",
          satisfaction: "Tỷ lệ hài lòng"
        },
        mobileNav: {
          services: "Dịch vụ",
          parts: "Linh kiện",
          team: "Đội ngũ",
          booking: "Đặt lịch"
        },
        services: {
          label: "NHỮNG DỊCH VỤ CHÚNG TÔI CUNG CẤP",
          title: "DỊCH VỤ ĐA DẠNG",
          desc: "Từ bảo trì định kỳ đến đại tu hiệu năng toàn diện, mọi dịch vụ đều được thực hiện với độ chính xác đạt tiêu chuẩn nhà máy.",
          item1: { title: "Bảo trì chính xác", desc: "Thay dầu định kỳ, kiểm tra chất lỏng, thay bộ lọc và kiểm tra toàn diện nhiều điểm bằng các quy trình theo tiêu chuẩn của nhà sản xuất." },
          item2: { title: "Sửa chữa nâng cao", desc: "Sửa chữa động cơ, đại tu hộp số, phục hồi hệ thống phanh và tinh chỉnh hệ thống treo bởi các kỹ thuật viên bậc thầy được chứng nhận." },
          item3: { title: "Chẩn đoán kỹ thuật số", desc: "Phân tích động cơ bằng máy tính, lập trình ECU, giải quyết mã lỗi và giám sát hiệu suất theo thời gian thực với các máy quét cấp đại lý." },
          item4: { title: "Dịch vụ chăm sóc xe cao cấp", desc: "Dịch vụ phủ gốm, hiệu chỉnh sơn, vệ sinh nội thất chuyên sâu và dán phìm bảo vệ để đạt được chất lượng hoàn thiện như trong showroom." },
          item5: { title: "Tối ưu hóa hiệu năng", desc: "Nâng cấp turbo, tối ưu hóa hệ thống ống xả, điều chỉnh hệ thống nạp khí và tăng công suất đã được kiểm nghiệm trên máy đo công suất." },
          item6: { title: "Bảo vệ xe", desc: "Các dịch vụ bảo hành mở rộng, xử lý chống gỉ, phủ gầm và giải pháp lưu trữ có kiểm soát nhiệt độ cho xe cổ." }
        },
        booking: {
          label: "ĐƠN GIẢN & NHANH CHÓNG",
          title: "Quy trình 4 bước",
          desc: "Đặt lịch bảo dưỡng cho chiếc xe của bạn chỉ trong vòng chưa đầy hai phút. Hệ thống thông minh của chúng tôi sẽ xử lý phần còn lại.",
          step1: { title: "Chọn dịch vụ", desc: "Lựa chọn các gói bảo dưỡng và sửa chữa toàn diện từ danh mục dịch vụ được thiết kế riêng cho dòng xe của bạn." },
          step2: { title: "Chọn thời gian", desc: "Chủ động chọn ngày giờ phù hợp trực tiếp trên hệ thống cập nhật lịch trống theo thời gian thực." },
          step3: { title: "Chọn kỹ thuật viên", desc: "Hệ thống sẽ tự động chỉ định hoặc cho phép bạn chọn chuyên gia kỹ thuật phù hợp nhất với yêu cầu." },
          step4: { title: "Xác nhận đặt lịch", desc: "Nhận ngay thông báo xác nhận lịch hẹn kèm thông tin chi tiết về gói dịch vụ, kỹ thuật viên phụ trách và chỉ dẫn đường đi." }
        },
        team: {
          label: "ĐỘI NGŨ CỦA CHÚNG TÔI",
          title: "Chuyên gia ưu tú",
          desc: "Mỗi chiếc xe khi đến với AGM đều được chăm sóc bởi đội ngũ kỹ thuật viên trưởng được đào tạo và chứng nhận từ hãng, sở hữu nhiều năm kinh nghiệm thực chiến trên các dòng xe sang hàng đầu thế giới.",
          workExperience: "Kinh nghiệm làm việc",
          masterTechs: "Chuyên gia kỹ thuật",
          certifications: "Chứng chỉ chuyên môn"
        },
        tech: {
          label: "CÔNG NGHỆ",
          title: "Giải pháp công nghệ",
          desc: "Quy trình chẩn đoán chuyên sâu giúp phân tích chi tiết từng hệ thống linh kiện, cho phép đội ngũ kỹ sư xác định chính xác và xử lý triệt để mọi sự cố.",
          diagBadge: "Chẩn đoán chuyên sâu"
        },
        testimonials: {
          label: "Ý KIẾN KHÁCH HÀNG",
          title: "Trải nghiệm khách hàng",
          googleReviewsTitle: "Phản hồi từ khách hàng",
          googleReviewsDesc: "Lắng nghe ý kiến và cảm nhận chân thực của khách hàng đã tin tưởng trải nghiệm dịch vụ chăm sóc, bảo dưỡng xe tại AGM Intelligent.",
          googleMapLink: "👉 Xem thêm các đánh giá trên Google Map: ",
          viewHere: "Xem tại đây",
          storiesTitle: "Câu chuyện khách hàng",
          storiesDesc: "Những chia sẻ thật tâm từ Khách hàng chính là niềm tự hào vô giá của AGM Intelligent, là minh chứng cho chất lượng dịch vụ tận tâm của chúng tôi!",
          storiesBadge: "HÀNH TRÌNH BẢO DƯỠNG"
        },
        news: {
          label: "TIN TỨC",
          title: "Tin tức & Sự kiện",
          viewAll: "Xem tất cả",
          tag1: "Kiến thức",
          tag2: "Hiệu năng",
          tag3: "Bảo dưỡng",
          date1: "Tháng 5 2026",
          date2: "Tháng 4 2026",
          date3: "Tháng 5 2026",
          article1: { title: "Tìm hiểu về công nghệ phủ ceramic: Bảo vệ tối ưu cho tài sản của bạn", desc: "Lớp phủ ceramic hiện đại liên kết ở cấp độ phân tử, tạo ra lớp màng bảo vệ kị nước có độ bền vượt trội so với các loại sáp phủ thông thường..." },
          article2: { title: "Tìm hiểu về tinh chỉnh ECU: Tăng hiệu năng nhưng vẫn đảm bảo độ bền", desc: "Làm thế nào để cân bằng giữa hiệu suất và tuổi thọ động cơ? Các chuyên gia Tuning của chúng tôi sẽ làm rõ các giới hạn an toàn..." },
          article3: { title: "Hướng dẫn chăm sóc xe cổ: Bảo vệ toàn diện trong điều kiện khí hậu ẩm", desc: "Kiểm soát nhiệt ẩm, bảo dưỡng ắc quy, bảo vệ lốp xe và kiểm tra các loại dung dịch — trọn bộ cẩm nang chăm sóc..." }
        },
        cta: {
          title: "Sẵn sàng trải nghiệm?",
          desc: "Chiếc xe của bạn xứng đáng được chăm sóc bởi những chuyên gia hàng đầu. Hãy đặt lịch hẹn ngay hôm nay để trải nghiệm dịch vụ chuẩn AGM Intelligent.",
          consultBtn: "Tư vấn ngay",
          schedule: "THỨ 2 - THỨ 7: 7:00 - 19:00"
        }
      }
    }
  },
  en: {
    translation: {
      common: {
        welcome: "Welcome",
        search: "Search...",
        save: "Save",
        cancel: "Cancel",
        edit: "Edit",
        delete: "Delete",
        loading: "Loading...",
        actions: "Actions",
        details: "Details",
        status: "Status",
        all: "All",
        back: "Back",
        next: "Next",
        processing: "Processing...",
        days: {
          sun: "Sun",
          mon: "Mon",
          tue: "Tue",
          wed: "Wed",
          thu: "Thu",
          fri: "Fri",
          sat: "Sat"
        }
      },
      nav: {
        home: "Home",
        services: "Services",
        parts: "Parts",
        team: "Our Team",
        profile: "Profile",
        contact: "Contact",
        booking: "Book Now",
        logout: "Logout",
        login: "Login"
      },
      footer: {
        tagline: "Precision automotive service for cars that demand perfection.",
        certified: "Factory certified technicians, dealership-grade diagnostics, and premium customer care since 2008.",
        services: "SERVICES",
        company: "COMPANY",
        contact: "CONTACT",
        rights: "© 2026 AGM Intelligent Service. All rights reserved.",
        maintenance: "Maintenance",
        repair: "Repair",
        diagnostics: "Diagnostics",
        detailing: "Detailing",
        performance: "Performance",
        aboutUs: "About Us",
        team: "Our Team",
        careers: "Careers",
        news: "News & Events",
        servicesHeader: "Services",
        companyHeader: "Company",
        contactHeader: "Contact",
        termsOfService: "Terms of Service",
        cookieSettings: "Cookie Settings"
      },
      profile: {
        title: "Personal Information",
        personalInfo: "Personal Info",
        fullName: "Full Name",
        phone: "Phone Number",
        email: "Email Address",
        address: "Address",
        recentActivity: "Recent Activity",
        viewAll: "View All",
        myCar: "My Vehicle",
        nextMaintenance: "Next Maintenance",
        carStatus: "Status",
        good: "Good",
        more: "more",
        viewCarDetails: "View Vehicle Details",
        historyTooltip: "View details in Repair History",
        cancelPhoto: "Cancel selection",
        saveNewPhoto: "Save new avatar",
        changeAvatar: "Change avatar photo",
        editNotice: "* You can modify the fields above and click Save to apply changes.",
        viewCarAlert: "Navigating to detailed vehicle specifications page...",
        goldMember: "Gold Member",
        joined: "Joined:",
        tierProgress: "Tier Progress: Platinum",
        pointsRemaining: "150 points remaining to reach Platinum",
        updateSuccess: "Profile updated successfully!",
        updateFail: "Update failed, please try again.",
        avatarUpdateSuccess: "Avatar updated successfully!",
        avatarUpdateFail: "Avatar update failed, please try again.",
        support: "Help & Support",
        supportMessage: "Online support system is connecting...",
        logoutConfirm: "Are you sure you want to log out?",
        logout: "Log Out",
        userProfile: "User Profile",
        tabs: {
          dashboard: "Dashboard",
          vehicles: "My Vehicles",
          appointments: "Appointments",
          history: "Repair History",
          warranty: "Warranty",
          settings: "Settings"
        }
      },
      notification: {
        title: "Notifications",
        markAllRead: "Mark all as read",
        empty: "No new notifications",
        clearAll: "Clear all",
        item1: {
          title: "Appointment Confirmed",
          desc: "Your routine maintenance appointment for Porsche 911 Carrera at 10:30 AM on 03/06/2026 has been confirmed.",
          time: "2 hours ago"
        },
        item2: {
          title: "Quote Approved",
          desc: "Your wheel alignment & 3D tire rotation quote request (BG-2023-4912) has been successfully approved.",
          time: "1 day ago"
        },
        item3: {
          title: "Maintenance Recommendation",
          desc: "Your BMW M4 Competition battery is showing weak voltage. You should schedule an inspection soon.",
          time: "3 days ago"
        }
      },
      history: {
        title: "Repair History",
        description: "Review your repair history, maintenance records, and service invoices.",
        invoiceId: "Invoice ID",
        date: "Service Date",
        vehicle: "Vehicle",
        service: "Service",
        totalPrice: "Total Price",
        status: "Status",
        invoiceDetail: "Invoice Details",
        downloadPdf: "Download PDF Invoice",
        vehicleLabel: "Vehicle:",
        invoiceDate: "Invoice Date:",
        itemDetails: "Item breakdown",
        item: "Item",
        qty: "Qty",
        price: "Unit Price",
        technician: "Technician in charge:",
        laborCost: "Labor cost:",
        partsCost: "Parts cost:",
        discount: "Discount / Deductions:",
        vat: "VAT (10%):",
        grandTotal: "TOTAL PAYMENT:",
        close: "Close",
        pdfAlert: "Preparing PDF download for invoice {{id}}...",
        status_Hoànthành: "Completed",
        status_Đangxửlý: "Processing",
        status_Đãhủy: "Cancelled"
      },
      vehicles: {
        oilLevel: "Oil Level",
        tirePressure: "Tire Pressure",
        brakePads: "Brake Pads",
        batteryStatus: "Battery Health",
        fair: "Fair",
        desc: "Manage your vehicle fleet and monitor maintenance progress.",
        addNew: "Add New Vehicle",
        detailsPorsche: "Model Year: 2023 • Color: GT Silver Metallic",
        detailsBMW: "Model Year: 2022 • Color: Portimao Blue Metallic",
        statusGood: "Active & Healthy",
        statusPending: "Maintenance Required Soon",
        partsStatus: "Component Condition",
        loadingHistory: "Loading all vehicle maintenance records...",
        loadingDetails: "Opening detailed vehicle specifications...",
        bookingRedirect: "Redirecting to online quick booking system...",
        initAddVehicle: "Add new vehicle feature is initializing..."
      },
      appointments: {
        title: "Book Service Appointment",
        description: "Complete the steps below to schedule care for your vehicle.",
        steps: {
          selectVehicle: "Select Vehicle",
          selectService: "Select Service",
          selectTime: "Select Time",
          confirm: "Confirm"
        },
        selectVehicleTitle: "Select your vehicle",
        selectServiceTitle: "Select required service",
        popular: "POPULAR",
        selected: "Selected",
        select: "Select",
        selectTimeTitle: "Select suitable appointment slot",
        monthYear: "October, 2023",
        dayOfWeek: "Tuesday",
        availableTimeSlots: "Available Time Slots",
        summaryTitle: "Service Summary",
        vehicle: "Vehicle",
        time: "Appointment Time",
        selectedService: "Selected Service",
        vatLabel: "VAT (10%)",
        estimatedTime: "Estimated Duration:",
        totalPrice: "Total Amount:",
        viewQuote: "View Quote",
        accept: "Accept",
        accepted: "Accepted",
        decline: "Decline",
        securedBy: "Secured by AGM Intelligent",
        detailedQuoteAlert: "Detailed quote:\n- {{title}}: {{price}}đ\n- VAT (10%): {{vat}}đ\n=> TOTAL AMOUNT: {{total}}đ",
        successAlert: "System confirmed and scheduled the appointment successfully! Thank you.",
        services: {
          thaynhot: "Oil Change",
          thaynhotDesc: "Premium synthetic engine oil",
          durationThayNhot: "60 mins",
          canchinh: "Wheel Alignment",
          canchinhDesc: "Pressure check & tire rotation",
          durationCanChinh: "45 mins",
          tongquat: "General Inspection",
          tongquatDesc: "50-point technical checklist",
          durationTongQuat: "120 mins"
        }
      },
      warranty: {
        quotesTitle: "Quotation Approval Requests",
        quotesDesc: "Review technical issues found during vehicle inspection and approve repair plans.",
        estimatedCost: "Estimated Cost",
        rejectQuoteTooltip: "Decline quote",
        approve: "Approve",
        infoTitle: "Warranty Information",
        infoDesc: "Track active warranties and expiration details for parts replaced at our workshop.",
        policyId: "Warranty Policy ID",
        partName: "Component",
        activationDate: "Activation Date",
        expirationDate: "Expiration Date",
        duration: "Warranty Period",
        quoteDetailTitle: "Estimated Quotation Details",
        repairItem: "Repair Service Item",
        techRecommendation: "Technician Observations & Recommendation",
        laborPartsCost: "Labor & Parts Cost:",
        grandTotalEstimate: "ESTIMATED TOTAL:",
        approvePlan: "Approve Repair Plan",
        reject: "Decline",
        sentDate: "Sent Date:",
        statusActive: "Under Warranty",
        statusExpired: "Expired",
        statusPending: "Awaiting Approval",
        statusApproved: "Approved",
        statusRejected: "Declined",
        approveSuccessAlert: "Quotation approved successfully! Our service advisor will call you to schedule the repair.",
        rejectSuccessAlert: "Service quotation has been declined.",
        parts: {
          oilFilter: "Genuine OEM Oil Filter",
          brakePads: "Ceramic Pro Brake Pads",
          cabinFilter: "Active Carbon Cabin Filter"
        },
        durations: {
          sixMonths: "6 months",
          twelveMonths: "12 months"
        },
        services: {
          coolantPump: "Coolant Water Pump Assembly Replacement",
          coolantPumpDesc: "Detected a minor coolant leak around the water pump gasket during routine checkup. Replacement is recommended to prevent engine overheating.",
          alignment: "Wheel Alignment & 3D Tire Rotation",
          alignmentDesc: "Tire tread wear patterns show unevenness. Alignment using Hunter 3D machine and tire rotation is recommended."
        }
      },
      settings: {
        title: "System Settings",
        profileCard: "Personal Profile",
        avatar: "Avatar Photo",
        fullNameLabel: "Full Name",
        phoneLabel: "Phone Number",
        security: "Security",
        changePasswordTitle: "Change Account Password",
        changePasswordDesc: "Regularly changing your password improves personal data protection and security.",
        changePasswordBtn: "Change Password",
        changePasswordSuccess: "Password changed successfully!",
        changePasswordFail: "Password change failed. Please verify your entries.",
        currentPasswordLabel: "Current Password",
        newPasswordLabel: "New Password",
        confirmPasswordLabel: "Confirm New Password",
        notifications: "Notifications",
        notificationsDesc: "Configure how you receive maintenance reminders and booking updates.",
        notifyPush: "Push Notifications",
        customization: "Customization",
        darkMode: "Dark Mode",
        appInfo: "Application Information",
        appVersion: "Version: 2.4.0 (Build 108)",
        terms: "Terms of Use",
        termsAlert: "AGM Intelligent Service terms of use.",
        privacy: "Privacy Policy",
        privacyAlert: "Data protection and privacy policy details.",
        cancelAlert: "Unsaved configuration changes have been discarded.",
        saving: "Saving changes...",
        saveChanges: "Save Changes",
        passwordMismatch: "New password and password confirmation do not match!"
      },
      team: {
        heroTitle: "Expert Team",
        heroDesc: "Our highly skilled and dedicated technicians commit to bringing absolute safety to your journey.",
        leadersLabel: "LEADERSHIP",
        leadersTitle: "Management Team",
        leaders: {
          tuan: {
            role: "Founder & CEO",
            bio: "With over 20 years of experience in the automotive industry, Mr. Tuan built AGM on the philosophy of \"Integrity & Precision.\" He believes transparency is the key to building long-term trust with customers."
          },
          ha: {
            role: "Service Director",
            bio: "An expert in managing international-standard technical processes. Mrs. Hà ensures every repair process at AGM Intelligent strictly complies with the highest safety and performance standards."
          }
        },
        techsLabel: "TECHNICAL TEAM",
        techsTitle: "Technical Specialists",
        techsDesc: "A collection of golden hands with leading technological wisdom in the field of automotive maintenance.",
        specialties: {
          engine: "ENGINE SPECIALIST",
          hybridEv: "HYBRID/EV SPECIALIST",
          diagnostic: "DIAGNOSTICS SPECIALIST",
          chassisBrakes: "UNDERCARRIAGE & BRAKES"
        },
        badges: {
          experience15: "15 Years Experience",
          teslaCertified: "Tesla Certified",
          masterDiagnostic: "Master Diagnostic",
          safetyExpert: "Safety Expert"
        },
        techs: {
          nam: {
            desc: "Leading expert in car engines, optimizing performance for European vehicle lines."
          },
          duc: {
            desc: "Pioneer in electric vehicle technology and high-voltage electrical systems, ensuring absolute safety for your car."
          },
          hung: {
            desc: "Master of system diagnostics using computer technology, resolving the most difficult issues."
          },
          viet: {
            desc: "Caring for every millimeter of the brake and suspension systems, offering smooth and safe rides on all terrains."
          }
        },
        ctaTitle: "Join Our Team",
        ctaDesc: "Are you passionate about cars and want to work in a professional, modern environment? We always welcome new talent.",
        viewJobs: "View Open Positions",
        sendResume: "Submit Resume"
      },
      services: {
        heroTitle: "Professional Services",
        heroDesc: "Elevate your maintenance experience with our highly skilled technicians and advanced diagnostics. We commit to bringing absolute safety to your journey.",
        emergencyConsult: "Quick Consultation",
        forYourCar: "FOR YOUR VEHICLE",
        catalogTitle: "Service Catalog",
        searchPlaceholder: "Search maintenance services...",
        originalPriceLabel: "Original Price:",
        discountLabel: "{{percent}}% Off",
        promoBadge: "Promo",
        categories: {
          maintenance: "Maintenance",
          repair: "Repair"
        },
        noResults: "No results found",
        noResultsDesc: "No services found matching \"{{query}}\". Please try another keyword or reset the filter.",
        resetFilters: "Reset filters",
        callRescue: "CALL EMERGENCY",
        bookService: "BOOK SERVICE",
        whyChooseUsTitle: "Why Choose AGM Intelligent?",
        whyChooseUs: {
          techs: {
            title: "Technicians",
            desc: "Our team consists of well-trained specialists with rich practical experience."
          },
          parts: {
            title: "Genuine Parts",
            desc: "Commitment to using 100% genuine components with transparent origin."
          },
          pricing: {
            title: "Transparent Pricing",
            desc: "Detailed quotation upfront with no hidden costs."
          },
          warranty: {
            title: "Long-term Warranty",
            desc: "Trustworthy warranty policies for all repair services and parts."
          }
        },
        faqTitle: "Frequently Asked Questions",
        faq: {
          q1: "How long does periodic maintenance take?",
          q2: "Do I need to book in advance?",
          q3: "Does AGM Intelligent offer replacement cars for long repairs?"
        },
        list: {
          periodic: {
            title: "Periodic Maintenance",
            desc: "General checkup and periodic replacement of worn parts to keep your vehicle running smoothly.",
            price: "From 500,000đ",
            originalPrice: "From 550,000đ",
            promoText: "Free premium windshield fluid & tire inspection",
            duration: "60 - 120 mins",
            details: [
              "Change engine oil matching vehicle specifications.",
              "Check and clean engine air filter and cabin air filter.",
              "Inspect brake systems, pads, and rotors.",
              "Check battery health and lighting systems.",
              "Read onboard diagnostic (OBD) system codes with special devices."
            ]
          },
          engine: {
            title: "Engine Repair",
            desc: "Resolve complex engine problems completely by highly experienced engine specialists.",
            price: "From 1,200,000đ",
            originalPrice: "From 1,400,000đ",
            promoText: "15% off fuel injector cleaning package",
            duration: "Half-day or full-day (depending on condition)",
            details: [
              "Measure combustion pressure, check engine compression ratio.",
              "Fix oil leaks and coolant loss issues.",
              "Adjust engine timing and address unusual engine knocks.",
              "Complete engine overhaul according to manufacturer standards.",
              "Clean fuel injectors, intake manifold, and combustion chamber."
            ]
          },
          tireBrake: {
            title: "Tire & Brake Service",
            desc: "Ensure maximum safety with tire checks, wheel balancing, and brake system maintenance.",
            price: "From 400,000đ",
            originalPrice: "From 500,000đ",
            promoText: "Free wheel balancing when buying 2+ Michelin tires",
            duration: "30 - 60 mins",
            details: [
              "Conduct advanced 3D wheel alignment.",
              "Execute dynamic wheel balancing to eliminate steering wheel vibration.",
              "Resurface brake rotors directly without removal.",
              "Replace brake pads with genuine imported parts.",
              "Inspect all brake lines and calipers."
            ]
          },
          detailing: {
            title: "Interior Detailing",
            desc: "Deep clean, deodorize, and condition leather and plastic surfaces inside the vehicle.",
            price: "From 800,000đ",
            originalPrice: "From 900,000đ",
            promoText: "Free Cabin Ozone deodorization package ($10 value)",
            duration: "120 - 240 mins",
            details: [
              "Conduct complete interior cleaning, vacuuming, and floor mat washing.",
              "Clean leather seat surfaces with deep conditioning products.",
              "Disinfect AC system and perform ozone deodorization.",
              "Condition dashboard and door trim to prevent UV aging.",
              "Meticulously clean headliner and trunk area."
            ]
          },
          electronics: {
            title: "Electronic Diagnostics",
            desc: "Use special scanning tools to detect exact electronic system faults in your vehicle.",
            price: "From 300,000đ",
            originalPrice: "From 350,000đ",
            promoText: "Free quick OBD fault diagnostic scan",
            duration: "30 - 45 mins",
            details: [
              "Scan all body electrical control module errors.",
              "Diagnose ABS, ESP, and SRS airbag sensor faults.",
              "Check alternator and starter motor conditions.",
              "Update control software (ECU flashing) if applicable.",
              "Clear temporary diagnostic codes from voltage drops."
            ]
          },
          rescue: {
            title: "Emergency Roadside 24/7",
            desc: "Emergency assistance anytime, anywhere when your car encounters sudden issues.",
            price: "Contact",
            originalPrice: "",
            promoText: "24/7 Roadside support in all metropolitan areas",
            duration: "Response in 15 - 30 mins",
            details: [
              "Provide rapid roadside jump start assistance.",
              "Assist with emergency spare tire installation.",
              "Deliver emergency fuel roadside.",
              "Tow vehicle to the nearest center using special flatbeds.",
              "Rescue team stands by 24 hours a day."
            ]
          }
        },
        modal: {
          duration: "Duration: {{duration}}",
          price: "Estimated Price: {{price}}",
          descriptionLabel: "Service Description",
          itemsLabel: "Work Items",
          guarantee: "All services are performed by highly skilled technicians and come with at least a 6-month genuine warranty."
        }
      },
      parts: {
        heroTitle: "Genuine Parts",
        heroDesc: "Enhance performance and safety for your beloved vehicle with 100% imported spare parts, long warranties, and professional installation.",
        badges: {
          genuine: {
            title: "100% Genuine",
            desc: "Quality guaranteed from the manufacturer"
          },
          warranty: {
            title: "Long Warranty",
            desc: "Peace of mind with a 1-to-1 replacement policy"
          },
          install: {
            title: "Installation Support",
            desc: "Free labor at our service centers"
          }
        },
        filterTitle: "Filters",
        vehicleTypeLabel: "Vehicle Type",
        vehicleTypes: {
          all: "All vehicle types",
          sport: "Sports cars"
        },
        brandLabel: "Brand",
        maxPriceLabel: "Max Price (VND)",
        searchPlaceholder: "Search parts (name, code)...",
        foundCount: "Found: ",
        foundCountSuffix: " parts",
        sortLabel: "Sort by:",
        sortOptions: {
          popular: "Most Popular",
          priceAsc: "Price: Low to High",
          priceDesc: "Price: High to Low",
          newest: "Newest"
        },
        noProducts: "No products found",
        noProductsDesc: "No parts match the current filter and keywords. Please reset filters to view all products.",
        buyNow: "Buy Now",
        inStock: "In Stock",
        outOfStock: "Out of Stock",
        modal: {
          code: "Part Code:",
          warranty: "Warranty Period:",
          compatibility: "Compatible Vehicles:",
          description: "Product Description:"
        },
        orderNow: "Order Now",
        alerts: {
          addedToQuote: "Added \"{{name}}\" to your quotation request.",
          ordered: "Added \"{{name}}\" to order request. Customer service will contact you shortly."
        },
        list: {
          brake: {
            name: "Ceramic Pro Brake Pads",
            desc: "High durability, reduced noise and brake dust, suitable for luxury vehicle lines.",
            warranty: "12 months"
          },
          oilFilter: {
            name: "Synthetic Oil Filter",
            desc: "Filters out 99% of impurities, keeping the engine running smoothly and durably.",
            warranty: "06 months"
          },
          sparkPlug: {
            name: "Iridium High-Performance Spark Plug",
            desc: "Extremely strong ignition, saves fuel and delivers smooth acceleration.",
            warranty: "12 months"
          },
          shock: {
            name: "Gas-Filled Shock Absorber",
            desc: "Improves cornering stability and provides a smooth driving feel.",
            warranty: "24 months"
          },
          airFilter: {
            name: "OEM Engine Air Filter",
            desc: "Optimizes intake air flow, protecting the engine from dust and debris.",
            warranty: "03 months"
          },
          battery: {
            name: "70Ah Maintenance-Free Battery",
            desc: "Maintenance-free technology, powerful starting even in cold weather.",
            warranty: "18 months"
          },
          oil: {
            name: "Synthetic 5W-30 Engine Oil",
            desc: "Maximum engine protection under all extreme temperature conditions."
          },
          wiper: {
            name: "Premium Silicon Wiper Blade",
            desc: "Cleans rainwater perfectly, lasts 3 times longer than standard rubber blades.",
            warranty: "06 months"
          },
          coolant: {
            name: "Radiator Coolant fluid",
            desc: "Helps lower engine temperature quickly, protecting the cooling system from corrosion."
          }
        }
      },
      booking: {
        heroTitle: "Book a Service",
        heroDesc: "Experience a minimalist maintenance booking process. Book in 1 minute to receive dedicated technical support at AGM Intelligent.",
        selectBookingMode: "Select Booking Mode",
        aiConsultation: "AI Consultation",
        serviceBooking: "Service Booking",
        savedVehicle: "Select Saved Vehicle",
        addNewVehicle: "Add New Vehicle",
        directConsultation: "Direct Consultation",
        consultationBooking: "Consultation Booking",
        selectServiceOrRepair: "Select Service or Repair",
        selectService: "Select Service",
        checkAndRepair: "Inspection & Repair",
        comboPackage: "Combo Package",
        singleService: "Single Service",
        discountText: "{{percent}}% Off",
        comboBadge: "Combo",
        comboPromoPrice: "Special Combo Price",
        comboOverlapWarning: "This Combo package includes single services you have already selected. The duplicate single services will be automatically unselected to avoid redundancy!",
        steps: {
          service: "SERVICE",
          time: "TIME",
          vehicle: "VEHICLE INFO",
          contact: "CONTACT"
        },
        services: {
          popularBadge: "POPULAR",
          emergencyBadge: "EMERGENCY",
          periodic: {
            title: "Periodic Maintenance",
            desc: "General inspection and replacement of wear items periodically to ensure smooth vehicle operation.",
            details: [
              "Replace engine oil with manufacturer-matching specifications.",
              "Inspect and clean engine air filter and cabin air filter.",
              "Inspect brake system, brake pads, and brake discs.",
              "Check battery health and lighting systems.",
              "Scan OBD diagnostics for faults using specialized scanners."
            ]
          },
          engine: {
            title: "Engine Repair",
            desc: "Resolve complex engine issues with certified master technicians.",
            details: [
              "Measure combustion pressure and engine compression ratio.",
              "Fix engine oil leaks and coolant loss issues.",
              "Calibrate camshaft and resolve unusual engine knocking sounds.",
              "Professional engine overhaul according to manufacturer standards.",
              "Clean injectors, intake manifold, and combustion chamber."
            ]
          },
          tireBrake: {
            title: "Tire & Brake Services",
            desc: "Ensure maximum safety with tire checks, dynamic balancing, and brake system maintenance.",
            details: [
              "Align wheels using state-of-the-art 3D technology.",
              "Balance tire weight to eliminate steering wheel vibration.",
              "Resurface brake discs directly without removal.",
              "Replace brake pads with genuine imported parts.",
              "Inspect all brake lines and caliper assemblies."
            ]
          },
          detailing: {
            title: "Interior Detailing",
            desc: "Deep clean, deodorize, and condition leather and plastic surfaces to like-new condition.",
            details: [
              "Comprehensive interior detailing, vacuuming, and carpet washing.",
              "Clean leather seats with specialized protective solutions.",
              "Deodorize A/C system and cabin with ozone treatment.",
              "Condition dashboard and door cards to prevent UV aging.",
              "Meticulously clean headliner and rear trunk."
            ]
          },
          electronics: {
            title: "Digital Diagnostics",
            desc: "Use advanced scanners to accurately detect all electronic system faults.",
            details: [
              "Scan all body electrical control unit errors.",
              "Diagnose ABS, ESP, and SRS airbag sensor faults.",
              "Test alternator and starter motor conditions.",
              "Flash ECU software updates if available.",
              "Clear ghost fault codes caused by voltage drops."
            ]
          },
          rescue: {
            title: "24/7 Roadside Rescue",
            desc: "Emergency assistance anytime, anywhere when your car encounters unexpected failures.",
            details: [
              "Provide on-site battery jump-starts quickly.",
              "Provide emergency spare tire replacement.",
              "Deliver emergency fuel on the road.",
              "Tow vehicle with specialized crane to nearest center.",
              "Rescue team on standby 24 hours a day."
            ]
          }
        },
        timeSlots: {
          morning: "Morning",
          afternoon: "Afternoon"
        },
        alerts: {
          validationError: "Please fill in all required information for the current step.",
          minOneTask: "You must select at least one task."
        },
        success: {
          title: "Booking Successful!",
          desc: "Your booking code is {{code}}. We have sent a confirmation email with details of your appointment. Customer service will contact you within 15 minutes.",
          goHome: "Back to Home",
          bookAnother: "Book Another Service"
        },
        summary: {
          serviceLabel: "Service:",
          timeLabel: "Time:",
          plateLabel: "Plate Number:",
          customerLabel: "Customer:",
          itemsLabel: "Tasks to Perform:"
        },
        step1: {
          title: "Select Maintenance Service",
          estimatedPrice: "Estimated Price",
          customizeTasks: "Customize service tasks",
          customizeTasksDesc: "Select or deselect specific tasks you want performed in the service package."
        },
        step2: {
          title: "Select Appointment Time",
          dateLabel: "Select Appointment Date",
          timeLabel: "Select Time Slot"
        },
        step3: {
          title: "Vehicle Information",
          brandLabel: "Make",
          brandPlaceholder: "E.g., Toyota, BMW, Mazda...",
          modelLabel: "Model",
          modelPlaceholder: "E.g., Camry, 320i, CX-5...",
          plateLabel: "License Plate",
          platePlaceholder: "E.g., 30A-123.45 or 51F-999.99"
        },
        step4: {
          title: "Contact Information",
          nameLabel: "Full Name",
          namePlaceholder: "John Doe",
          phoneLabel: "Phone Number",
          phonePlaceholder: "0912345678",
          emailLabel: "Email Address",
          emailPlaceholder: "customer@example.com"
        },
        buttons: {
          back: "Back",
          processing: "Processing...",
          confirm: "Confirm Booking",
          next: "Next"
        },
        sidebar: {
          title: "Booking Summary",
          serviceLabel: "Selected Service",
          notSelected: "Not selected",
          timeLabel: "Appointment Time",
          vehicleLabel: "Vehicle",
          notEntered: "Not entered",
          servicePrice: "Service Price",
          installationFee: "Installation & Check labor",
          free: "Free",
          total: "Total",
          estimatedNote: "* Estimated Price",
          itemsLabel: "Selected Tasks"
        },
        hotline: {
          title: "Need direct consultation?",
          value: "Hotline: 1900 1234"
        }
      },
      home: {
        hero: {
          badge: "Certified by 12 leading vehicle manufacturers",
          title1: "Care for your ",
          title2: "BELOVED CAR",
          desc1: "Factory-certified technicians. Dealer-grade diagnostics.",
          desc2: "Premium service for cars that demand absolute perfection.",
          bookBtn: "Book Now",
          exploreBtn: "Explore Services",
          badge1: "Engine Maintenance",
          badge2: "Electronics & ECU Diagnostics",
          badge3: "Safety Brake System"
        },
        stats: {
          experience: "Years of experience",
          maintained: "Cars maintained",
          satisfaction: "Satisfaction rate"
        },
        mobileNav: {
          services: "Services",
          parts: "Parts",
          team: "Our Team",
          booking: "Book"
        },
        services: {
          label: "SERVICES WE PROVIDE",
          title: "DIVERSE SERVICES",
          desc: "From routine maintenance to full performance overhauls, every service is performed with factory-grade precision.",
          item1: { title: "Precision Maintenance", desc: "Periodic oil changes, fluid checks, filter replacements, and multi-point inspections following manufacturer-standard procedures." },
          item2: { title: "Advanced Repair", desc: "Engine repairs, transmission overhauls, brake system restoration, and suspension tuning by master-certified technicians." },
          item3: { title: "Digital Diagnostics", desc: "Computer engine analysis, ECU programming, fault code resolution, and real-time performance monitoring with dealer-grade scanners." },
          item4: { title: "Elite Detailing", desc: "Ceramic coating, paint correction, deep interior cleaning, and protective film to achieve showroom-quality finish." },
          item5: { title: "Performance Tuning", desc: "Turbo upgrades, exhaust system optimization, intake tuning, and dyno-tested power gains." },
          item6: { title: "Vehicle Protection", desc: "Extended warranty services, rust treatment, undercoating, and temperature-controlled storage for classic cars." }
        },
        booking: {
          label: "SIMPLE & FAST",
          title: "4-Step Process",
          desc: "Book maintenance for your car in under two minutes. Our intelligent system will handle the rest.",
          step1: { title: "Select Service", desc: "Choose from comprehensive maintenance and repair packages designed specifically for your vehicle type." },
          step2: { title: "Choose Time", desc: "Flexibly select a date and time directly on our real-time availability system." },
          step3: { title: "Pick Technician", desc: "The system will auto-assign or let you select the most suitable technical expert for your needs." },
          step4: { title: "Confirm Booking", desc: "Receive an instant confirmation with full details about your service package, assigned technician, and directions." }
        },
        team: {
          label: "OUR TEAM",
          title: "Elite Experts",
          desc: "Every car at AGM is cared for by factory-certified lead technicians with years of real-world experience on the world's finest vehicles.",
          workExperience: "Work experience",
          masterTechs: "Master technicians",
          certifications: "Professional certifications"
        },
        tech: {
          label: "TECHNOLOGY",
          title: "Technology Solutions",
          desc: "In-depth diagnostics analyze every component system in detail, enabling our engineers to precisely identify and thoroughly resolve every issue.",
          diagBadge: "In-depth Diagnostics"
        },
        testimonials: {
          label: "CUSTOMER REVIEWS",
          title: "Customer Experiences",
          googleReviewsTitle: "Customer feedback",
          googleReviewsDesc: "Listen to authentic feedback and feelings from customers who have trusted and experienced car care and maintenance services at AGM Intelligent.",
          googleMapLink: "👉 See more reviews on Google Maps: ",
          viewHere: "View here",
          storiesTitle: "Customer Stories",
          storiesDesc: "Sincere shares from Customers are the invaluable pride of AGM Intelligent, a testament to our dedicated service quality!",
          storiesBadge: "MAINTENANCE JOURNEY"
        },
        news: {
          label: "NEWS",
          title: "News & Events",
          viewAll: "View All",
          tag1: "Knowledge",
          tag2: "Performance",
          tag3: "Maintenance",
          date1: "May 2026",
          date2: "April 2026",
          date3: "May 2026",
          article1: { title: "The science behind ceramic coatings: Optimal protection for your investment", desc: "Modern ceramic coatings bond at a molecular level, creating a hydrophobic protective film far more durable than conventional wax products..." },
          article2: { title: "Understanding ECU tuning: Power gains without compromising reliability", desc: "How do you balance performance and engine longevity? Our Tuning experts will clarify the safe limits..." },
          article3: { title: "Classic car care guide: Full protection in humid climate conditions", desc: "Humidity control, battery maintenance, tire protection and fluid checks \u2014 the complete care handbook..." }
        },
        cta: {
          title: "Ready to experience?",
          desc: "Your car deserves the best experts. Book an appointment today to experience the AGM Intelligent standard.",
          consultBtn: "Consult Now",
          schedule: "MON - SAT: 7:00 - 19:00"
        }
      }
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'vi',
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    }
  });

export default i18n;
