const starContainer = document.querySelector('.stars');
    const starCount = 50;

    for (let i = 0; i < starCount; i++) {
      const star = document.createElement('div');
      star.classList.add('star');
      star.style.setProperty('--star-tail-length', `${Math.random() * 7 + 5}em`);
      star.style.setProperty('--top-offset', `${Math.random() * 100}vh`);
      star.style.setProperty('--fall-duration', `${Math.random() * 6 + 6}s`);
      star.style.setProperty('--fall-delay', `${Math.random() * 10}s`);
      starContainer.appendChild(star);
    }

// chữ chạy trên title

    const text = "Axle";
    const container = document.getElementById("text-container");
    let index = 0;

    function typeWriter() {
        if (index < text.length) {
            container.innerHTML += text.charAt(index);
            index++;
            setTimeout(typeWriter, 750); 
        } else {
            index = 0;
            container.innerHTML = "";
            setTimeout(typeWriter, 1000);
        }
    }
    typeWriter();




