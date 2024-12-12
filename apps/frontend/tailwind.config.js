/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    // backgroundImage:{
    //   'logBg':"https://cdn.gather.town/v0/b/gather-town.appspot.com/o/images%2Fsignin_bg.png?alt=media&token=be54b54c-34be-4644-a640-7d69507f0941"
    // },
    extend: {
      backgroundImage: {
        'logbg': "url('https://cdn.gather.town/v0/b/gather-town.appspot.com/o/images%2Fsignin_bg.png?alt=media&token=be54b54c-34be-4644-a640-7d69507f0941')",
        "Hero": "linear-gradient(#202540, #252c5d 42%, #3a3dab)",
        "nav-200":"#202540"
      }
    },
  },
  plugins: [],
}