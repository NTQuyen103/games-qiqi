// Nội dung intro
const introText = "...";
const introElement = document.getElementById("intro-text");
const mainContent = document.getElementById("container");
const music = document.getElementById("background-music");

let a = 0;

// Hiệu ứng gõ chữ
function intro_typeWriter() {
    if (a < introText.length) {
        introElement.textContent += introText.charAt(a);
        a++;
        setTimeout(intro_typeWriter, 1000); // Tốc độ gõ chữ (100ms mỗi ký tự)
    } else {
        // Kết thúc intro, chuyển sang trang chính
        setTimeout(() => {
            intro.style.opacity = "0"; // Fade out intro
            setTimeout(() => {
                intro.style.display = "none"; // Ẩn intro
                mainContent.style.display = "block"; // Hiển thị trang chính
                if (music) { // Add null check
                    music.play(); // Phát nhạc nền
                }
            }, 1000); // Thời gian fade out (1 giây)
        }, 2000); // Thời gian chờ trước khi fade out (2 giây)
    }
}
// Bắt đầu hiệu ứng
intro_typeWriter();
